import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireApiKey } from "../middleware/auth";
import {
  createPaymentOnChain,
  getPaymentOnChain,
  getPaymentStatusOnChain,
  calculateFeeOnChain,
  releasePaymentOnChain,
  STATUS_MAP,
} from "../services/stacksService";

export const paymentsRouter = Router();

paymentsRouter.post("/create", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { amount_sats, memo, private_key } = req.body;
    const merchantId = (req as any).merchantId as string;
    if (!amount_sats || !private_key) {
      res.status(400).json({ error: "Missing required fields: amount_sats, private_key" });
      return;
    }
    if (amount_sats <= 0) {
      res.status(400).json({ error: "amount_sats must be greater than 0" });
      return;
    }
    const paymentId = `pay_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const feeResult = await calculateFeeOnChain(amount_sats);
    const fee       = Number((feeResult as any)?.value ?? 0);
    const net       = amount_sats - fee;
    const txResult  = await createPaymentOnChain(paymentId, merchantId, amount_sats, private_key);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    res.status(201).json({
      payment_id:  paymentId,
      merchant_id: merchantId,
      amount_sats,
      fee_sats:    fee,
      net_sats:    net,
      status:      "pending",
      expires_at:  expiresAt.toISOString(),
      memo:        memo ?? null,
      tx_id:       (txResult as any).txid ?? "pending",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

paymentsRouter.get("/:paymentId", async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const data = await getPaymentOnChain(paymentId);
    if (!data) { res.status(404).json({ error: "Payment not found" }); return; }
    res.json({ payment_id: paymentId, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

paymentsRouter.get("/:paymentId/status", async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const result = await getPaymentStatusOnChain(paymentId);
    if (result === null || result === undefined) {
      res.status(404).json({ error: "Payment not found" }); return;
    }
    const statusCode = Number((result as any)?.value ?? result);
    res.json({
      payment_id:  paymentId,
      status_code: statusCode,
      status:      STATUS_MAP[statusCode] ?? "unknown",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

paymentsRouter.post("/:paymentId/release", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { private_key } = req.body;
    if (!private_key) { res.status(400).json({ error: "Missing field: private_key" }); return; }
    const txResult = await releasePaymentOnChain(paymentId, private_key);
    res.json({
      payment_id: paymentId,
      status:     "release_broadcast",
      tx_id:      (txResult as any).txid ?? "pending",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});