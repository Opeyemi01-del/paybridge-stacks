import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?:  string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 10,
      padding: "20px 24px",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-head)",
        fontSize: 28,
        fontWeight: 700,
        color: accent ? "var(--accent)" : "var(--text)",
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}