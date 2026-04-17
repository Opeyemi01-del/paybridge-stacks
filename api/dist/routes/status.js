"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRouter = void 0;
const express_1 = require("express");
const stacksService_1 = require("../services/stacksService");
exports.statusRouter = (0, express_1.Router)();
exports.statusRouter.get("/", async (_req, res) => {
    try {
        const feeTest = await (0, stacksService_1.calculateFeeOnChain)(1_000_000);
        const chainOk = feeTest !== null && feeTest !== undefined;
        res.json({
            ok: true,
            service: "PayBridge API",
            version: "0.1.0",
            network: process.env.STACKS_NETWORK ?? "devnet",
            chain_ok: chainOk,
            fee_example: {
                amount_sats: 1_000_000,
                fee_sats: Number(feeTest?.value ?? 0),
                note: "0.5% protocol fee",
            },
        });
    }
    catch (err) {
        res.status(503).json({ ok: false, error: err.message });
    }
});
