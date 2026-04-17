"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const payments_1 = require("./routes/payments");
const merchants_1 = require("./routes/merchants");
const webhooks_1 = require("./routes/webhooks");
const status_1 = require("./routes/status");
const docs_1 = require("./routes/docs");
const Eventlistener_1 = require("./services/Eventlistener");
const webhookWorker_1 = require("./workers/webhookWorker");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3001);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/v1/payments", payments_1.paymentsRouter);
app.use("/v1/merchants", merchants_1.merchantsRouter);
app.use("/v1/webhooks", webhooks_1.webhooksRouter);
app.use("/v1/status", status_1.statusRouter);
app.use("/docs", docs_1.docsRouter);
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "paybridge-api", version: "0.1.0" });
});
app.listen(PORT, () => {
    console.log(`\nPayBridge API running on http://localhost:${PORT}`);
    console.log(`Network: ${process.env.STACKS_NETWORK ?? "devnet"}\n`);
    (0, webhookWorker_1.startWebhookWorker)();
    (0, Eventlistener_1.startEventListener)();
});
