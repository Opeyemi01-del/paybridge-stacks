import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { requireApiKey } from "../middleware/auth.js";
import {
  createPaymentOnChain,
  getPaymentOnChain,
  getPaymentStatusOnChain,
  calculateFeeOnChain,
  releasePaymentOnChain,
  STATUS_MAP,
} from "../src/services/stacksService.js";

export const paymentsRouter = Router();

// POST /v1/payments/create
// Create a payment intent on-chain
// Auth: x-api-key header
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

    // Calculate fee for display
    const feeResult = await calculateFeeOnChain(amount_sats);
    const fee = Number(feeResult?.value ?? 0);
    const net = amount_sats - fee;

    // Broadcast create-payment transaction
    const txResult = await createPaymentOnChain(
      paymentId, merchantId, amount_sats, private_key
    );

    // Expiry: ~144 Bitcoin blocks from now (~24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    res.status(201).json({
      payment_id:   paymentId,
      merchant_id:  merchantId,
      amount_sats,
      fee_sats:     fee,
      net_sats:     net,
      status:       "pending",
      expires_at:   expiresAt.toISOString(),
      memo:         memo ?? null,
      tx_id:        (txResult as any).txid ?? "pending",
      message:      "Payment intent created. Awaiting sBTC deposit.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/payments/:paymentId
// Get full payment details from chain
paymentsRouter.get("/:paymentId", async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const data = await getPaymentOnChain(paymentId);

    if (!data) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json({ payment_id: paymentId, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/payments/:paymentId/status
// Lightweight status check
paymentsRouter.get("/:paymentId/status", async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const result = await getPaymentStatusOnChain(paymentId);

    if (result === null || result === undefined) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const statusCode = Number(result?.value ?? result);
    res.json({
      payment_id: paymentId,
      status_code: statusCode,
      status: STATUS_MAP[statusCode] ?? "unknown",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/payments/:paymentId/release
// Release confirmed payment funds to merchant wallet
paymentsRouter.post("/:paymentId/release", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { private_key } = req.body;

    if (!private_key) {
      res.status(400).json({ error: "Missing required field: private_key" });
      return;
    }

    const txResult = await releasePaymentOnChain(paymentId, private_key);

    res.json({
      payment_id: paymentId,
      status:     "release_broadcast",
      tx_id:      (txResult as any).txid ?? "pending",
      message:    "Release transaction broadcast. Funds will arrive after confirmation.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});