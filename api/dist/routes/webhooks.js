"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const client_1 = require("../db/client");
const webhookWorker_1 = require("../workers/webhookWorker");
exports.webhooksRouter = (0, express_1.Router)();
exports.webhooksRouter.post("/register", auth_1.requireApiKey, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { url, events } = req.body;
        if (!url) {
            res.status(400).json({ error: "Missing required field: url" });
            return;
        }
        const supported = ["payment.confirmed", "payment.released", "payment.refunded"];
        const requested = events ?? supported;
        const invalid = requested.filter((e) => !supported.includes(e));
        if (invalid.length > 0) {
            res.status(400).json({ error: "Invalid event types", invalid_events: invalid, supported_events: supported });
            return;
        }
        await client_1.db.query(`UPDATE merchants SET webhook_url = $1 WHERE id = $2`, [url, merchantId]);
        res.status(201).json({ merchant_id: merchantId, webhook_url: url, events: requested,
            signature_header: "X-PayBridge-Sig" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.webhooksRouter.get("/deliveries", auth_1.requireApiKey, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const limit = Math.min(parseInt(req.query.limit ?? "20"), 100);
        const { rows } = await client_1.db.query(`SELECT id, payment_id, event, url, status_code, success, attempts, last_error, delivered_at, created_at
       FROM webhook_deliveries WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2`, [merchantId, limit]);
        res.json({ merchant_id: merchantId, deliveries: rows, count: rows.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.webhooksRouter.post("/test", auth_1.requireApiKey, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { url } = req.body;
        if (!url) {
            res.status(400).json({ error: "Missing field: url" });
            return;
        }
        await webhookWorker_1.webhookQueue.add("webhook.test", {
            event: "webhook.test", payment_id: "test_payment_id", merchant_id: merchantId,
            webhook_url: url, payload: { event: "webhook.test", merchant_id: merchantId,
                message: "Test webhook from PayBridge.", timestamp: new Date().toISOString() },
        });
        res.json({ message: "Test webhook queued.", webhook_url: url });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
