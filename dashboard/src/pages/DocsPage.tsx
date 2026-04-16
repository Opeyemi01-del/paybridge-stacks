import React from "react";

export function DocsPage() {
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
          API Docs
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Interactive Swagger UI served at the API server
        </div>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 32,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          {"{ }"}
        </div>
        <div style={{
          fontFamily: "var(--font-head)",
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        }}>
          Swagger UI
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
          Start the API server then open the interactive docs
        </div>
        <a
          href="http://localhost:3001/docs"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--accent)",
            color: "#000",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Open Swagger UI
        </a>
        <div style={{ marginTop: 32, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Quick Reference
          </div>
          {[
            ["POST", "/v1/merchants/register", "Register merchant"],
            ["POST", "/v1/payments/create",    "Create payment intent"],
            ["GET",  "/v1/payments/:id/status","Check status"],
            ["POST", "/v1/payments/:id/release","Release funds"],
            ["POST", "/v1/webhooks/register",  "Set webhook URL"],
          ].map(([method, path, desc]) => (
            <div key={path} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
            }}>
              <span style={{
                width: 44,
                color: method === "GET" ? "var(--green)" : "var(--accent)",
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {method}
              </span>
              <code style={{ color: "var(--text)", flex: 1 }}>{path}</code>
              <span style={{ color: "var(--muted)" }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}