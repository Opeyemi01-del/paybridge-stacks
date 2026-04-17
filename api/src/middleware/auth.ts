import { Request, Response, NextFunction } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"] as string | undefined;
  if (!key) { res.status(401).json({ error: "Missing x-api-key header" }); return; }
  const parts = key.split("_");
  if (parts.length < 3 || parts[0] !== "pb") {
    res.status(401).json({ error: "Invalid API key format. Use pb_<merchantId>_<secret>" });
    return;
  }
  (req as any).merchantId = parts[1];
  next();
}