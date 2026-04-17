import { Router }      from "express";
import swaggerUi        from "swagger-ui-express";
import { readFileSync } from "fs";
import { parse }        from "yaml";
import { join }         from "path";

const specPath = join(__dirname, "../../../docs/openapi.yaml");
let spec: object = {};
try {
  spec = parse(readFileSync(specPath, "utf-8"));
} catch {
  spec = { openapi: "3.0.3", info: { title: "PayBridge API", version: "0.1.0" }, paths: {} };
}

export const docsRouter = Router();

// Cast to any to avoid swagger-ui-express / @types/express version mismatch
docsRouter.use("/", swaggerUi.serve as any);
docsRouter.get("/", swaggerUi.setup(spec, {
  customSiteTitle: "PayBridge API Docs",
  customCss: `.swagger-ui .topbar { background: #0f0f0f; }`,
}) as any);