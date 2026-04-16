import { Router, Request, Response } from "express";
import { calculateFeeOnChain } from "../src/services/stacksService.js";

export const statusRouter = Router();

// GET /v1/status
// API health + network info
statusRouter.get("/", async (_req: Request, res: Response) => {
  try {
    // Quick chain connectivity test
    const feeTest = await calculateFeeOnChain(1_000_000);
    const chainOk = feeTest !== null && feeTest !== undefined;

    res.json({
      ok:          true,
      service:     "PayBridge API",
      version:     "0.1.0",
      network:     process.env.STACKS_NETWORK ?? "devnet",
      chain_ok:    chainOk,
      fee_example: {
        amount_sats: 1_000_000,
        fee_sats:    Number(feeTest?.value ?? 0),
        note:        "0.5% protocol fee",
      },
    });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err.message });
  }
});