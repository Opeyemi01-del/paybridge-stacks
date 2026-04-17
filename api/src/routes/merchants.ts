import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getMerchantOnChain, registerMerchantOnChain } from "../services/stacksService";

export const merchantsRouter = Router();

merchantsRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, webhook_url, private_key } = req.body;
    if (!name || !webhook_url || !private_key) {
      res.status(400).json({ error: "Missing required fields: name, webhook_url, private_key" });
      return;
    }
    const merchantId = uuidv4().replace(/-/g, "").slice(0, 20);
    const apiKey     = `pb_${merchantId}_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const txResult   = await registerMerchantOnChain(merchantId, name, webhook_url, private_key);
    res.status(201).json({
      merchant_id: merchantId,
      api_key:     apiKey,
      name,
      webhook_url,
      tx_id:   (txResult as any).txid ?? "pending",
      message: "Merchant registered.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

merchantsRouter.get("/:merchantId", async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const data = await getMerchantOnChain(merchantId);
    if (!data) { res.status(404).json({ error: "Merchant not found" }); return; }
    res.json({ merchant_id: merchantId, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});