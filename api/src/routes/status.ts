import { Router, Request, Response } from "express";
import { calculateFeeOnChain } from "../services/stacksService";

export const statusRouter = Router();

statusRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const feeTest = await calculateFeeOnChain(1_000_000);
    const chainOk = feeTest !== null && feeTest !== undefined;
    res.json({
      ok:       true,
      service:  "PayBridge API",
      version:  "0.1.0",
      network:  process.env.STACKS_NETWORK ?? "devnet",
      chain_ok: chainOk,
      fee_example: {
        amount_sats: 1_000_000,
        fee_sats:    Number((feeTest as any)?.value ?? 0),
        note:        "0.5% protocol fee",
      },
    });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err.message });
  }
});