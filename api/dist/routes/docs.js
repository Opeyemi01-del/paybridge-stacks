"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docsRouter = void 0;
const express_1 = require("express");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const fs_1 = require("fs");
const yaml_1 = require("yaml");
const path_1 = require("path");
const specPath = (0, path_1.join)(__dirname, "../../../docs/openapi.yaml");
let spec = {};
try {
    spec = (0, yaml_1.parse)((0, fs_1.readFileSync)(specPath, "utf-8"));
}
catch {
    spec = { openapi: "3.0.3", info: { title: "PayBridge API", version: "0.1.0" }, paths: {} };
}
exports.docsRouter = (0, express_1.Router)();
// Cast to any to avoid swagger-ui-express / @types/express version mismatch
exports.docsRouter.use("/", swagger_ui_express_1.default.serve);
exports.docsRouter.get("/", swagger_ui_express_1.default.setup(spec, {
    customSiteTitle: "PayBridge API Docs",
    customCss: `.swagger-ui .topbar { background: #0f0f0f; }`,
}));
