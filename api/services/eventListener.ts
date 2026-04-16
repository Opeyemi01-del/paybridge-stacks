/**
 * PayBridge On-Chain Event Listener
 * Hours 10-16: polls the Stacks API for contract print events,
 * detects payment confirmations, and queues webhook deliveries.
 *
 * How it works:
 *   1. Every 10 seconds, poll /extended/v1/contract/:id/events
 *   2. Parse each event's print value
 *   3. On "payment-confirmed" event -> update DB + queue webhook
 *   4. On "payment-released" event  -> update DB + queue webhook
 */

import { webhookQueue } from "../workers/webhookWorker.js";
import { db } from "../db/client.js";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? "";
const GATEWAY_CONTRACT = "payment-gateway";
const API_URL          = process.env.STACKS_API_URL ?? "http://localhost:3999";
const POLL_INTERVAL_MS = 10_000; // 10 seconds

// Track the last event index we processed to avoid duplicates
let lastProcessedOffset = 0;

async function fetchContractEvents(offset: number): Promise<any[]> {
  const url =
    `${API_URL}/extended/v1/contract/` +
    `${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT}/events` +
    `?limit=50&offset=${offset}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[listener] Stacks API returned ${res.status}`);
    return [];
  }

  const json = await res.json() as any;
  return json.results ?? [];
}

function parseEventValue(event: any): Record<string, any> | null {
  try {
    // Stacks API returns contract_log events with a hex-encoded repr
    const repr = event?.contract_log?.value?.repr ?? "";

    // repr looks like: (tuple (event "payment-confirmed") (payment-id "pay_abc") ...)
    // We extract key-value pairs from the tuple repr
    const pairs: Record<string, any> = {};

    // Match key: value pairs inside the tuple
    const matches = repr.matchAll(/\(([a-z-]+)\s+("([^"]+)"|u(\d+)|([a-z]+))\)/g);
    for (const m of matches) {
      const key = m[1];
      // String value
      if (m[3] !== undefined) pairs[key] = m[3];
      // Uint value
      else if (m[4] !== undefined) pairs[key] = BigInt(m[4]);
      // Bool/keyword
      else if (m[5] !== undefined) pairs[key] = m[5];
    }

    return pairs;
  } catch {
    return null;
  }
}

async function handlePaymentConfirmed(data: Record<string, any>, txId: string, blockHeight: number) {
  const paymentId = data["payment-id"] as string;
  if (!paymentId) return;

  console.log(`[listener] Payment confirmed: ${paymentId} (tx: ${txId})`);

  // Update DB
  await db.query(
    `UPDATE payments
     SET status = 'confirmed', tx_id = $1, stacks_block = $2, confirmed_at = NOW()
     WHERE id = $3`,
    [txId, blockHeight, paymentId]
  );

  // Fetch payment to get merchant info for webhook
  const { rows } = await db.query(
    `SELECT p.*, m.webhook_url, m.id as mid
     FROM payments p
     JOIN merchants m ON p.merchant_id = m.id
     WHERE p.id = $1`,
    [paymentId]
  );

  if (rows.length === 0) {
    console.warn(`[listener] Payment ${paymentId} not found in DB -- skipping webhook`);
    return;
  }

  const payment = rows[0];

  // Queue webhook delivery
  await webhookQueue.add("payment.confirmed", {
    event:       "payment.confirmed",
    payment_id:  paymentId,
    merchant_id: payment.merchant_id,
    webhook_url: payment.webhook_url,
    payload: {
      event:        "payment.confirmed",
      payment_id:   paymentId,
      merchant_id:  payment.merchant_id,
      amount_sats:  payment.amount_sats,
      fee_sats:     payment.fee_sats,
      net_sats:     payment.net_sats,
      tx_id:        txId,
      block_height: blockHeight,
      confirmed_at: new Date().toISOString(),
    },
  });
}

async function handlePaymentReleased(data: Record<string, any>, txId: string, blockHeight: number) {
  const paymentId = data["payment-id"] as string;
  if (!paymentId) return;

  console.log(`[listener] Payment released: ${paymentId} (tx: ${txId})`);

  await db.query(
    `UPDATE payments
     SET status = 'released', released_at = NOW()
     WHERE id = $1`,
    [paymentId]
  );

  const { rows } = await db.query(
    `SELECT p.*, m.webhook_url
     FROM payments p
     JOIN merchants m ON p.merchant_id = m.id
     WHERE p.id = $1`,
    [paymentId]
  );

  if (rows.length === 0) return;
  const payment = rows[0];

  await webhookQueue.add("payment.released", {
    event:       "payment.released",
    payment_id:  paymentId,
    merchant_id: payment.merchant_id,
    webhook_url: payment.webhook_url,
    payload: {
      event:        "payment.released",
      payment_id:   paymentId,
      merchant_id:  payment.merchant_id,
      net_sats:     payment.net_sats,
      tx_id:        txId,
      block_height: blockHeight,
      released_at:  new Date().toISOString(),
    },
  });
}

async function handlePaymentRefunded(data: Record<string, any>, txId: string) {
  const paymentId = data["payment-id"] as string;
  if (!paymentId) return;

  console.log(`[listener] Payment refunded: ${paymentId}`);

  await db.query(
    `UPDATE payments SET status = 'refunded' WHERE id = $1`,
    [paymentId]
  );
}

async function processEvent(event: any) {
  const txId       = event.tx_id ?? "";
  const blockHeight = event.block_height ?? 0;
  const data        = parseEventValue(event);

  if (!data || !data["event"]) return;

  switch (data["event"]) {
    case "payment-confirmed":
      await handlePaymentConfirmed(data, txId, blockHeight);
      break;
    case "payment-released":
      await handlePaymentReleased(data, txId, blockHeight);
      break;
    case "payment-refunded":
      await handlePaymentRefunded(data, txId);
      break;
    // merchant-registered events: no action needed
    default:
      break;
  }
}

export async function startEventListener() {
  console.log(
    `[listener] Starting on-chain event listener\n` +
    `           Contract: ${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT}\n` +
    `           Polling every ${POLL_INTERVAL_MS / 1000}s`
  );

  async function poll() {
    try {
      const events = await fetchContractEvents(lastProcessedOffset);

      if (events.length > 0) {
        console.log(`[listener] Processing ${events.length} new event(s)`);

        for (const event of events) {
          await processEvent(event);
        }

        lastProcessedOffset += events.length;
      }
    } catch (err: any) {
      console.error(`[listener] Poll error: ${err.message}`);
    }

    // Schedule next poll
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  // Start polling
  setTimeout(poll, 2000); // 2s initial delay so server starts first
}