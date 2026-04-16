import React, { useState } from "react";

const MOCK_DELIVERIES = [
  { id: 1, event: "payment.confirmed", payment_id: "pay_a1b2c3d4", status_code: 200, success: true,  attempts: 1, delivered_at: new Date(Date.now() - 120000).toISOString() },
  { id: 2, event: "payment.released",  payment_id: "pay_i9j0k1l2", status_code: 200, success: true,  attempts: 1, delivered_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, event: "payment.confirmed", payment_id: "pay_q7r8s9t0", status_code: 0,   success: false, attempts: 3, delivered_at: null, last_error: "Timeout after 8s" },
];

export function WebhooksPage() {
  const [url, setUrl]       = useState("");
  const [saved, setSaved]   = useState(false);

  function save() {
    if (!url) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          marginBottom: 6,
        }}>
          Webhooks
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          PayBridge sends signed POST requests when payment events occur
        </div>
      </div>

      {/* Register */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Webhook Endpoint
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="https://yourapp.com/hooks/paybridge"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <button
            onClick={save}
            style={{
              padding: "8px 20px",
              background: saved ? "var(--green)22" : "var(--accent)",
              border: "none",
              borderRadius: 6,
              color: saved ? "var(--green)" : "#000",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          Verify deliveries with header X-PayBridge-Sig (HMAC-SHA256)
        </div>
      </div>

      {/* Delivery log */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 600 }}>
            Recent Deliveries
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Event","Payment","Status","Attempts","Delivered"].map(h => (
                <th key={h} style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "var(--muted)",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_DELIVERIES.map((d, i) => (
              <tr
                key={d.id}
                style={{ borderBottom: i < MOCK_DELIVERIES.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--accent)" }}>
                  {d.event}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                  {d.payment_id}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {d.success ? (
                    <span style={{ color: "var(--green)", fontSize: 12 }}>HTTP {d.status_code}</span>
                  ) : (
                    <span style={{ color: "var(--red)", fontSize: 12 }}>{d.last_error ?? `HTTP ${d.status_code}`}</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                  {d.attempts}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                  {d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString() : "failed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}