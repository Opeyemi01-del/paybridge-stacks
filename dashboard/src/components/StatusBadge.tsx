import React from "react";
import { statusColors } from "../lib/api.ts";

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "#666";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      color,
      border: `1px solid ${color}33`,
      background: `${color}11`,
      letterSpacing: "0.05em",
    }}>
      {status}
    </span>
  );
}