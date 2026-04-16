import "dotenv/config";
import express         from "express";
import cors            from "cors";
import { paymentsRouter }  from "../routes/payments.js";
import { merchantsRouter } from "../routes/merchants.js";
import { webhooksRouter }  from "../routes/webhooks.js";
import { statusRouter }    from "../routes/status.js";
import { startEventListener } from "../services/eventListener.js";
import { startWebhookWorker } from "../workers/webhookWorker.js";

const app  = express();
const PORT = process.env.PORT ?? 3003;

app.use(cors());
app.use(express.json());

// Routes
app.use("/v1/payments",  paymentsRouter);
app.use("/v1/merchants", merchantsRouter);
app.use("/v1/webhooks",  webhooksRouter);
app.use("/v1/status",    statusRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "paybridge-api", version: "0.1.0" });
});

app.listen(PORT, async () => {
  console.log(`\nPayBridge API running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.STACKS_NETWORK ?? "devnet"}\n`);

  // Start background services
  startWebhookWorker();
  await startEventListener();
});