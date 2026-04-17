import "dotenv/config";
import express from "express";
import cors from "cors";
import { paymentsRouter }     from "./routes/payments";
import { merchantsRouter }    from "./routes/merchants";
import { webhooksRouter }     from "./routes/webhooks";
import { statusRouter }       from "./routes/status";
import { docsRouter }         from "./routes/docs";
import { startEventListener } from "./services/Eventlistener";
import { startWebhookWorker } from "./workers/webhookWorker";

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.use("/v1/payments",  paymentsRouter);
app.use("/v1/merchants", merchantsRouter);
app.use("/v1/webhooks",  webhooksRouter);
app.use("/v1/status",    statusRouter);
app.use("/docs",         docsRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "paybridge-api", version: "0.1.0" });
});

app.listen(PORT, () => {
  console.log(`\nPayBridge API running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.STACKS_NETWORK ?? "devnet"}\n`);
  startWebhookWorker();
  startEventListener();
});