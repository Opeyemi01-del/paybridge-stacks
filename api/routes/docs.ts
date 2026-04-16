import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { join } from "path";

const specPath = join(__dirname, "../../../docs/openapi.yaml");

let spec: object;
try {
  spec = parse(readFileSync(specPath, "utf-8"));
} catch {
  spec = {
    openapi: "3.0.3",
    info: { title: "PayBridge API", version: "0.1.0" },
    paths: {},
  };
}

export const docsRouter = Router();

// Cast to any to bypass TypeScript errors
docsRouter.use('/api-docs', swaggerUi.serve as any);
docsRouter.get('/api-docs', swaggerUi.setup(spec, {
  customSiteTitle: "PayBridge API Docs",
  customCss: `
    .swagger-ui .topbar { background: #0f0f0f; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: "PayBridge API";
      color: #f97316;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
  `,
}) as any);