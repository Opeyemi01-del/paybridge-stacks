"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const stacksService_1 = require("../services/stacksService");
exports.merchantsRouter = (0, express_1.Router)();
exports.merchantsRouter.post("/register", async (req, res) => {
    try {
        const { name, webhook_url, private_key } = req.body;
        if (!name || !webhook_url || !private_key) {
            res.status(400).json({ error: "Missing required fields: name, webhook_url, private_key" });
            return;
        }
        const merchantId = (0, uuid_1.v4)().replace(/-/g, "").slice(0, 20);
        const apiKey = `pb_${merchantId}_${(0, uuid_1.v4)().replace(/-/g, "").slice(0, 16)}`;
        const txResult = await (0, stacksService_1.registerMerchantOnChain)(merchantId, name, webhook_url, private_key);
        res.status(201).json({
            merchant_id: merchantId,
            api_key: apiKey,
            name,
            webhook_url,
            tx_id: txResult.txid ?? "pending",
            message: "Merchant registered.",
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.merchantsRouter.get("/:merchantId", async (req, res) => {
    try {
        const { merchantId } = req.params;
        const data = await (0, stacksService_1.getMerchantOnChain)(merchantId);
        if (!data) {
            res.status(404).json({ error: "Merchant not found" });
            return;
        }
        res.json({ merchant_id: merchantId, ...data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
