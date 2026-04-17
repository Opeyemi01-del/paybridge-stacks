"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const stacksService_1 = require("../services/stacksService");
exports.paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter.post("/create", auth_1.requireApiKey, async (req, res) => {
    try {
        const { amount_sats, memo, private_key } = req.body;
        const merchantId = req.merchantId;
        if (!amount_sats || !private_key) {
            res.status(400).json({ error: "Missing required fields: amount_sats, private_key" });
            return;
        }
        if (amount_sats <= 0) {
            res.status(400).json({ error: "amount_sats must be greater than 0" });
            return;
        }
        const paymentId = `pay_${(0, uuid_1.v4)().replace(/-/g, "").slice(0, 16)}`;
        const feeResult = await (0, stacksService_1.calculateFeeOnChain)(amount_sats);
        const fee = Number(feeResult?.value ?? 0);
        const net = amount_sats - fee;
        const txResult = await (0, stacksService_1.createPaymentOnChain)(paymentId, merchantId, amount_sats, private_key);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        res.status(201).json({
            payment_id: paymentId,
            merchant_id: merchantId,
            amount_sats,
            fee_sats: fee,
            net_sats: net,
            status: "pending",
            expires_at: expiresAt.toISOString(),
            memo: memo ?? null,
            tx_id: txResult.txid ?? "pending",
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.paymentsRouter.get("/:paymentId", async (req, res) => {
    try {
        const { paymentId } = req.params;
        const data = await (0, stacksService_1.getPaymentOnChain)(paymentId);
        if (!data) {
            res.status(404).json({ error: "Payment not found" });
            return;
        }
        res.json({ payment_id: paymentId, ...data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.paymentsRouter.get("/:paymentId/status", async (req, res) => {
    try {
        const { paymentId } = req.params;
        const result = await (0, stacksService_1.getPaymentStatusOnChain)(paymentId);
        if (result === null || result === undefined) {
            res.status(404).json({ error: "Payment not found" });
            return;
        }
        const statusCode = Number(result?.value ?? result);
        res.json({
            payment_id: paymentId,
            status_code: statusCode,
            status: stacksService_1.STATUS_MAP[statusCode] ?? "unknown",
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.paymentsRouter.post("/:paymentId/release", auth_1.requireApiKey, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { private_key } = req.body;
        if (!private_key) {
            res.status(400).json({ error: "Missing field: private_key" });
            return;
        }
        const txResult = await (0, stacksService_1.releasePaymentOnChain)(paymentId, private_key);
        res.json({
            payment_id: paymentId,
            status: "release_broadcast",
            tx_id: txResult.txid ?? "pending",
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
