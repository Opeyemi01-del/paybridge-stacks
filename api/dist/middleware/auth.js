"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
function requireApiKey(req, res, next) {
    const key = req.headers["x-api-key"];
    if (!key) {
        res.status(401).json({ error: "Missing x-api-key header" });
        return;
    }
    const parts = key.split("_");
    if (parts.length < 3 || parts[0] !== "pb") {
        res.status(401).json({ error: "Invalid API key format. Use pb_<merchantId>_<secret>" });
        return;
    }
    req.merchantId = parts[1];
    next();
}
