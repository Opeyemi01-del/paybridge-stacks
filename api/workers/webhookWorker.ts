/**
 * PayBridge Webhook Worker
 * Hours 10-16: BullMQ queue that delivers payment events to merchant endpoints.
 *
 * Features:
 *   - Automatic retries (3 attempts, exponential backoff)
 *   - HMAC-SHA256 signature on every delivery
 *   - Delivery log stored in DB
 *   - Dead letter queue for failed deliveries
 */

import { Queue, Worker, Job } from "bullmq";
import { createHmac }         from "crypto";
import { db }                 from "../db/client.js";

const REDIS_URL      = process.env.REDIS_URL ?? "redis://localhost:6379";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev_secret";
const TIMEOUT_MS     = 8_000;   // 8 second timeout per webhook attempt
const MAX_RETRIES    = 3;

// Parse Redis URL for BullMQ connection
function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host:     u.hostname,
    port:     parseInt(u.port ?? "6379"),
    password: u.password || undefined,
  };
}

const connection = parseRedisUrl(REDIS_URL);

// The queue -- events are added here by the event listener
export const webhookQueue = new Queue("webhooks", {
  connection,
  defaultJobOptions: {
    attempts:    MAX_RETRIES,
    backoff: {
      type:  "exponential",
      delay: 2000,    // 2s, 4s, 8s
    },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

// Sign the payload with HMAC-SHA256 so merchants can verify authenticity
function signPayload(payload: object): string {
  const body = JSON.stringify(payload);
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

// Deliver a single webhook with timeout
async function deliverWebhook(
  url: string,
  payload: object,
  signature: string
): Promise<{ statusCode: number; success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":       "application/json",
        "X-PayBridge-Sig":    signature,
        "X-PayBridge-Event":  (payload as any).event ?? "unknown",
        "User-Agent":         "PayBridge-Webhook/1.0",
      },
      body: JSON.stringify(payload),
    });

    return { statusCode: res.status, success: res.status >= 200 && res.status < 300 };
  } catch (err: any) {
    const msg = err.name === "AbortError" ? "Timeout after 8s" : err.message;
    return { statusCode: 0, success: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

// Log delivery attempt to DB
async function logDelivery(
  paymentId:  string,
  merchantId: string,
  event:      string,
  url:        string,
  payload:    object,
  result:     { statusCode: number; success: boolean; error?: string },
  attempt:    number
) {
  try {
    await db.query(
      `INSERT INTO webhook_deliveries
         (payment_id, merchant_id, event, url, payload, status_code, success, attempts, last_error, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING`,
      [
        paymentId,
        merchantId,
        event,
        url,
        JSON.stringify(payload),
        result.statusCode,
        result.success,
        attempt,
        result.error ?? null,
        result.success ? new Date() : null,
      ]
    );
  } catch (err: any) {
    console.error(`[webhook] DB log error: ${err.message}`);
  }
}

// The worker processes jobs from the queue
export function startWebhookWorker() {
  const worker = new Worker(
    "webhooks",
    async (job: Job) => {
      const { event, payment_id, merchant_id, webhook_url, payload } = job.data;

      console.log(
        `[webhook] Delivering ${event} to ${webhook_url} ` +
        `(attempt ${job.attemptsMade + 1}/${MAX_RETRIES})`
      );

      const signature = signPayload(payload);
      const result    = await deliverWebhook(webhook_url, payload, signature);

      await logDelivery(
        payment_id,
        merchant_id,
        event,
        webhook_url,
        payload,
        result,
        job.attemptsMade + 1
      );

      if (!result.success) {
        // Throw to trigger BullMQ retry
        throw new Error(
          result.error ?? `HTTP ${result.statusCode} from ${webhook_url}`
        );
      }

      console.log(`[webhook] Delivered ${event} to ${webhook_url} (HTTP ${result.statusCode})`);
    },
    {
      connection,
      concurrency: 5,  // process up to 5 webhooks in parallel
    }
  );

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[webhook] Job ${job.id} failed (${job.attemptsMade}/${MAX_RETRIES}): ${err.message}`
      );
    }
  });

  worker.on("error", (err) => {
    console.error(`[webhook] Worker error: ${err.message}`);
  });

  console.log("[webhook] Worker started -- listening for jobs");
  return worker;
}

// Helper: manually re-queue a failed delivery (admin use)
export async function requeueDelivery(paymentId: string, webhookUrl: string, payload: object) {
  await webhookQueue.add("manual.retry", {
    event:       (payload as any).event,
    payment_id:  paymentId,
    merchant_id: (payload as any).merchant_id,
    webhook_url: webhookUrl,
    payload,
  });
}