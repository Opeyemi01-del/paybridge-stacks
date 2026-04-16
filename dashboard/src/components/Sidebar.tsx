import React from "react";

interface SidebarProps {
  page: string;
  setPage: (p: string) => void;
}

const links = [
  { id: "overview",     label: "Overview",     icon: ">" },
  { id: "payments",     label: "Payments",     icon: "#" },
  { id: "webhooks",     label: "Webhooks",     icon: "~" },
  { id: "apikeys",      label: "API Keys",     icon: "*" },
  { id: "docs",         label: "Docs",         icon: "?" },
];

export function Sidebar({ page, setPage }: SidebarProps) {
  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "28px 24px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          fontFamily: "var(--font-head)",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--accent)",
          letterSpacing: "-0.5px",
        }}>
          PayBridge
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          Bitcoin L2 Gateway
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {links.map(link => (
          <button
            key={link.id}
            onClick={() => setPage(link.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 12px",
              marginBottom: 2,
              background: page === link.id ? "#1a1a1a" : "transparent",
              border: "none",
              borderRadius: 6,
              color: page === link.id ? "var(--accent)" : "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              textAlign: "left",
              transition: "all 0.1s",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11, width: 14, opacity: 0.7 }}>{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>

      {/* Network badge */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid var(--border)",
        fontSize: 11,
        color: "var(--muted)",
      }}>
        <span style={{
          display: "inline-block",
          width: 6, height: 6,
          background: "var(--green)",
          borderRadius: "50%",
          marginRight: 6,
        }} />
        devnet
      </div>
    </aside>
  );
}