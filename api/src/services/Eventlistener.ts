import { webhookQueue } from "../workers/webhookWorker";
import { db }            from "../db/client";

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? "";
const GATEWAY_CONTRACT = "payment-gateway";
const API_URL          = process.env.STACKS_API_URL ?? "http://localhost:3999";
const POLL_INTERVAL_MS = 10_000;
let lastProcessedOffset = 0;

async function fetchContractEvents(offset: number): Promise<any[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT}/events?limit=50&offset=${offset}`;
  try {
    const res  = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json() as any;
    return json.results ?? [];
  } catch { return []; }
}

function parseEventValue(event: any): Record<string, any> | null {
  try {
    const repr = event?.contract_log?.value?.repr ?? "";
    const pairs: Record<string, any> = {};
    const matches = repr.matchAll(/\(([a-z-]+)\s+("([^"]+)"|u(\d+)|([a-z]+))\)/g);
    for (const m of matches) {
      const key = m[1];
      if (m[3] !== undefined)      pairs[key] = m[3];
      else if (m[4] !== undefined) pairs[key] = BigInt(m[4]);
      else if (m[5] !== undefined) pairs[key] = m[5];
    }
    return pairs;
  } catch { return null; }
}

async function handlePaymentConfirmed(data: Record<string, any>, txId: string, blockHeight: number) {
  const paymentId = data["payment-id"] as string;
  if (!paymentId) return;
  console.log(`[listener] Payment confirmed: ${paymentId}`);
  try {
    await db.query(
      `UPDATE payments SET status='confirmed', tx_id=$1, stacks_block=$2, confirmed_at=NOW() WHERE id=$3`,
      [txId, blockHeight, paymentId]
    );
    const { rows } = await db.query(
      `SELECT p.*, m.webhook_url FROM payments p JOIN merchants m ON p.merchant_id=m.id WHERE p.id=$1`,
      [paymentId]
    );
    if (rows.length === 0) return;
    const p = rows[0];
    await webhookQueue.add("payment.confirmed", {
      event: "payment.confirmed", payment_id: paymentId, merchant_id: p.merchant_id,
      webhook_url: p.webhook_url,
      payload: { event: "payment.confirmed", payment_id: paymentId, merchant_id: p.merchant_id,
        amount_sats: p.amount_sats, fee_sats: p.fee_sats, net_sats: p.net_sats,
        tx_id: txId, block_height: blockHeight, confirmed_at: new Date().toISOString() },
    });
  } catch (err: any) { console.error(`[listener] DB error: ${err.message}`); }
}

async function handlePaymentReleased(data: Record<string, any>, txId: string, blockHeight: number) {
  const paymentId = data["payment-id"] as string;
  if (!paymentId) return;
  try {
    await db.query(`UPDATE payments SET status='released', released_at=NOW() WHERE id=$1`, [paymentId]);
    const { rows } = await db.query(
      `SELECT p.*, m.webhook_url FROM payments p JOIN merchants m ON p.merchant_id=m.id WHERE p.id=$1`,
      [paymentId]
    );
    if (rows.length === 0) return;
    const p = rows[0];
    await webhookQueue.add("payment.released", {
      event: "payment.released", payment_id: paymentId, merchant_id: p.merchant_id,
      webhook_url: p.webhook_url,
      payload: { event: "payment.released", payment_id: paymentId, merchant_id: p.merchant_id,
        net_sats: p.net_sats, tx_id: txId, block_height: blockHeight, released_at: new Date().toISOString() },
    });
  } catch (err: any) { console.error(`[listener] DB error: ${err.message}`); }
}

async function processEvent(event: any) {
  const txId        = event.tx_id ?? "";
  const blockHeight = event.block_height ?? 0;
  const data        = parseEventValue(event);
  if (!data || !data["event"]) return;
  switch (data["event"]) {
    case "payment-confirmed": await handlePaymentConfirmed(data, txId, blockHeight); break;
    case "payment-released":  await handlePaymentReleased(data, txId, blockHeight); break;
    case "payment-refunded":
      try { await db.query(`UPDATE payments SET status='refunded' WHERE id=$1`, [data["payment-id"]]); }
      catch (err: any) { console.error(`[listener] DB error: ${err.message}`); }
      break;
  }
}

export function startEventListener() {
  console.log(`[listener] Polling ${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT} every ${POLL_INTERVAL_MS / 1000}s`);
  async function poll() {
    try {
      const events = await fetchContractEvents(lastProcessedOffset);
      if (events.length > 0) {
        for (const event of events) await processEvent(event);
        lastProcessedOffset += events.length;
      }
    } catch (err: any) { console.error(`[listener] Poll error: ${err.message}`); }
    setTimeout(poll, POLL_INTERVAL_MS);
  }
  setTimeout(poll, 2000);
}