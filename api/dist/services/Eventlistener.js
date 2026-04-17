"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEventListener = startEventListener;
const webhookWorker_1 = require("../workers/webhookWorker");
const client_1 = require("../db/client");
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ?? "";
const GATEWAY_CONTRACT = "payment-gateway";
const API_URL = process.env.STACKS_API_URL ?? "http://localhost:3999";
const POLL_INTERVAL_MS = 10_000;
let lastProcessedOffset = 0;
async function fetchContractEvents(offset) {
    const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT}/events?limit=50&offset=${offset}`;
    try {
        const res = await fetch(url);
        if (!res.ok)
            return [];
        const json = await res.json();
        return json.results ?? [];
    }
    catch {
        return [];
    }
}
function parseEventValue(event) {
    try {
        const repr = event?.contract_log?.value?.repr ?? "";
        const pairs = {};
        const matches = repr.matchAll(/\(([a-z-]+)\s+("([^"]+)"|u(\d+)|([a-z]+))\)/g);
        for (const m of matches) {
            const key = m[1];
            if (m[3] !== undefined)
                pairs[key] = m[3];
            else if (m[4] !== undefined)
                pairs[key] = BigInt(m[4]);
            else if (m[5] !== undefined)
                pairs[key] = m[5];
        }
        return pairs;
    }
    catch {
        return null;
    }
}
async function handlePaymentConfirmed(data, txId, blockHeight) {
    const paymentId = data["payment-id"];
    if (!paymentId)
        return;
    console.log(`[listener] Payment confirmed: ${paymentId}`);
    try {
        await client_1.db.query(`UPDATE payments SET status='confirmed', tx_id=$1, stacks_block=$2, confirmed_at=NOW() WHERE id=$3`, [txId, blockHeight, paymentId]);
        const { rows } = await client_1.db.query(`SELECT p.*, m.webhook_url FROM payments p JOIN merchants m ON p.merchant_id=m.id WHERE p.id=$1`, [paymentId]);
        if (rows.length === 0)
            return;
        const p = rows[0];
        await webhookWorker_1.webhookQueue.add("payment.confirmed", {
            event: "payment.confirmed", payment_id: paymentId, merchant_id: p.merchant_id,
            webhook_url: p.webhook_url,
            payload: { event: "payment.confirmed", payment_id: paymentId, merchant_id: p.merchant_id,
                amount_sats: p.amount_sats, fee_sats: p.fee_sats, net_sats: p.net_sats,
                tx_id: txId, block_height: blockHeight, confirmed_at: new Date().toISOString() },
        });
    }
    catch (err) {
        console.error(`[listener] DB error: ${err.message}`);
    }
}
async function handlePaymentReleased(data, txId, blockHeight) {
    const paymentId = data["payment-id"];
    if (!paymentId)
        return;
    try {
        await client_1.db.query(`UPDATE payments SET status='released', released_at=NOW() WHERE id=$1`, [paymentId]);
        const { rows } = await client_1.db.query(`SELECT p.*, m.webhook_url FROM payments p JOIN merchants m ON p.merchant_id=m.id WHERE p.id=$1`, [paymentId]);
        if (rows.length === 0)
            return;
        const p = rows[0];
        await webhookWorker_1.webhookQueue.add("payment.released", {
            event: "payment.released", payment_id: paymentId, merchant_id: p.merchant_id,
            webhook_url: p.webhook_url,
            payload: { event: "payment.released", payment_id: paymentId, merchant_id: p.merchant_id,
                net_sats: p.net_sats, tx_id: txId, block_height: blockHeight, released_at: new Date().toISOString() },
        });
    }
    catch (err) {
        console.error(`[listener] DB error: ${err.message}`);
    }
}
async function processEvent(event) {
    const txId = event.tx_id ?? "";
    const blockHeight = event.block_height ?? 0;
    const data = parseEventValue(event);
    if (!data || !data["event"])
        return;
    switch (data["event"]) {
        case "payment-confirmed":
            await handlePaymentConfirmed(data, txId, blockHeight);
            break;
        case "payment-released":
            await handlePaymentReleased(data, txId, blockHeight);
            break;
        case "payment-refunded":
            try {
                await client_1.db.query(`UPDATE payments SET status='refunded' WHERE id=$1`, [data["payment-id"]]);
            }
            catch (err) {
                console.error(`[listener] DB error: ${err.message}`);
            }
            break;
    }
}
function startEventListener() {
    console.log(`[listener] Polling ${CONTRACT_ADDRESS}.${GATEWAY_CONTRACT} every ${POLL_INTERVAL_MS / 1000}s`);
    async function poll() {
        try {
            const events = await fetchContractEvents(lastProcessedOffset);
            if (events.length > 0) {
                for (const event of events)
                    await processEvent(event);
                lastProcessedOffset += events.length;
            }
        }
        catch (err) {
            console.error(`[listener] Poll error: ${err.message}`);
        }
        setTimeout(poll, POLL_INTERVAL_MS);
    }
    setTimeout(poll, 2000);
}
