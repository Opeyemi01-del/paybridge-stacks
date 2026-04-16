import { Request, Response, NextFunction } from "express";

// Simple API key middleware
// In production: look up key in DB and attach merchant to request
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"] as string | undefined;

  if (!key) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  // For hackathon: accept any non-empty key and extract merchant ID from it
  // Format: "pb_<merchant_id>_<secret>"
  const parts = key.split("_");
  if (parts.length < 3 || parts[0] !== "pb") {
    res.status(401).json({ error: "Invalid API key format. Use pb_<merchantId>_<secret>" });
    return;
  }

  // Attach merchant ID to request for downstream use
  (req as any).merchantId = parts[1];
  next();
}