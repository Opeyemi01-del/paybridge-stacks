import React, { useState } from "react";

export function ApiKeys() {
  const [copied, setCopied] = useState(false);
  const demoKey = "pb_mer001_a1b2c3d4e5f6g7h8";

  function copy() {
    navigator.clipboard.writeText(demoKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          API Keys
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Use your API key in the x-api-key header on all authenticated requests
        </div>
      </div>

      {/* Key display */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Your API Key
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <code style={{
            flex: 1,
            background: "#0a0a0a",
            border: "1px solid var(--border2)",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            wordBreak: "break-all",
          }}>
            {demoKey}
          </code>
          <button
            onClick={copy}
            style={{
              padding: "10px 16px",
              background: copied ? "var(--green)22" : "var(--accent)22",
              border: `1px solid ${copied ? "var(--green)" : "var(--accent)"}`,
              borderRadius: 6,
              color: copied ? "var(--green)" : "var(--accent)",
              whiteSpace: "nowrap",
              fontSize: 12,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Usage example */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 24,
      }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Usage Example
        </div>
        <pre style={{
          background: "#0a0a0a",
          border: "1px solid var(--border2)",
          borderRadius: 6,
          padding: 16,
          fontSize: 12,
          color: "#a3e635",
          overflow: "auto",
          lineHeight: 1.8,
        }}>
{`curl -X POST http://localhost:3001/v1/payments/create \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${demoKey}" \\
  -d '{
    "amount_sats": 1000000,
    "memo": "Order #99",
    "private_key": "YOUR_STACKS_PRIVATE_KEY"
  }'`}
        </pre>
      </div>
    </div>
  );
}