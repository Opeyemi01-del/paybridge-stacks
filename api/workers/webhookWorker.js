"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookQueue = void 0;
exports.startWebhookWorker = startWebhookWorker;
const bullmq_1 = require("bullmq");
const crypto_1 = require("crypto");
const client_1 = require("../api/db/client");
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev_secret";
const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 3;
function parseRedisUrl(url) {
    const u = new URL(url);
    return { host: u.hostname, port: parseInt(u.port ?? "6379"), password: u.password || undefined };
}
const connection = parseRedisUrl(REDIS_URL);
exports.webhookQueue = new bullmq_1.Queue("webhooks", {
    connection,
    defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});
function signPayload(payload) {
    return (0, crypto_1.createHmac)("sha256", WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex");
}
async function deliverWebhook(url, payload, signature) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: "POST", signal: controller.signal,
            headers: { "Content-Type": "application/json", "X-PayBridge-Sig": signature,
                "X-PayBridge-Event": payload.event ?? "unknown", "User-Agent": "PayBridge-Webhook/1.0" },
            body: JSON.stringify(payload),
        });
        return { statusCode: res.status, success: res.status >= 200 && res.status < 300 };
    }
    catch (err) {
        return { statusCode: 0, success: false, error: err.name === "AbortError" ? "Timeout after 8s" : err.message };
    }
    finally {
        clearTimeout(timeout);
    }
}
function startWebhookWorker() {
    const worker = new bullmq_1.Worker("webhooks", async (job) => {
        const { event, payment_id, merchant_id, webhook_url, payload } = job.data;
        console.log(`[webhook] Delivering ${event} to ${webhook_url} (attempt ${job.attemptsMade + 1}/${MAX_RETRIES})`);
        const signature = signPayload(payload);
        const result = await deliverWebhook(webhook_url, payload, signature);
        try {
            await client_1.db.query(`INSERT INTO webhook_deliveries (payment_id, merchant_id, event, url, payload, status_code, success, attempts, last_error, delivered_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`, [payment_id, merchant_id, event, webhook_url, JSON.stringify(payload),
                result.statusCode, result.success, job.attemptsMade + 1,
                result.error ?? null, result.success ? new Date() : null]);
        }
        catch (dbErr) {
            console.error(`[webhook] DB log error: ${dbErr.message}`);
        }
        if (!result.success)
            throw new Error(result.error ?? `HTTP ${result.statusCode}`);
        console.log(`[webhook] Delivered ${event} (HTTP ${result.statusCode})`);
    }, { connection, concurrency: 5 });
    worker.on("failed", (job, err) => {
        if (job)
            console.error(`[webhook] Job ${job.id} failed: ${err.message}`);
    });
    console.log("[webhook] Worker started");
    return worker;
}
