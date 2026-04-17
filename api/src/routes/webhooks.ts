import { Router, Request, Response } from "express";
import { requireApiKey }              from "../middleware/auth";
import { db }                         from "../db/client";
import { webhookQueue }               from "../workers/webhookWorker";

export const webhooksRouter = Router();

webhooksRouter.post("/register", requireApiKey, async (req: Request, res: Response) => {
  try {
    const merchantId      = (req as any).merchantId as string;
    const { url, events } = req.body;
    if (!url) { res.status(400).json({ error: "Missing required field: url" }); return; }
    const supported = ["payment.confirmed", "payment.released", "payment.refunded"];
    const requested: string[] = events ?? supported;
    const invalid = requested.filter((e: string) => !supported.includes(e));
    if (invalid.length > 0) {
      res.status(400).json({ error: "Invalid event types", invalid_events: invalid, supported_events: supported });
      return;
    }
    await db.query(`UPDATE merchants SET webhook_url = $1 WHERE id = $2`, [url, merchantId]);
    res.status(201).json({ merchant_id: merchantId, webhook_url: url, events: requested,
      signature_header: "X-PayBridge-Sig" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

webhooksRouter.get("/deliveries", requireApiKey, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId as string;
    const limit      = Math.min(parseInt(req.query.limit as string ?? "20"), 100);
    const { rows }   = await db.query(
      `SELECT id, payment_id, event, url, status_code, success, attempts, last_error, delivered_at, created_at
       FROM webhook_deliveries WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [merchantId, limit]
    );
    res.json({ merchant_id: merchantId, deliveries: rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

webhooksRouter.post("/test", requireApiKey, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId as string;
    const { url }    = req.body;
    if (!url) { res.status(400).json({ error: "Missing field: url" }); return; }
    await webhookQueue.add("webhook.test", {
      event: "webhook.test", payment_id: "test_payment_id", merchant_id: merchantId,
      webhook_url: url, payload: { event: "webhook.test", merchant_id: merchantId,
        message: "Test webhook from PayBridge.", timestamp: new Date().toISOString() },
    });
    res.json({ message: "Test webhook queued.", webhook_url: url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});