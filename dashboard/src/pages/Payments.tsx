import React, { useState } from "react";
import { StatusBadge }   from "../components/StatusBadge.tsx";
import { satsToBtc, timeAgo } from "../lib/api.ts";

// Mock data -- replace with real API calls using your API key
const MOCK_PAYMENTS = [
  { id: "pay_a1b2c3d4", merchant_id: "mer_001", amount_sats: 1000000, fee_sats: 5000, net_sats: 995000, status: "confirmed", created_at: new Date(Date.now() - 120000).toISOString(), tx_id: "0xabc123" },
  { id: "pay_e5f6g7h8", merchant_id: "mer_001", amount_sats: 500000,  fee_sats: 2500, net_sats: 497500, status: "pending",   created_at: new Date(Date.now() - 60000).toISOString(),  tx_id: null },
  { id: "pay_i9j0k1l2", merchant_id: "mer_001", amount_sats: 2000000, fee_sats: 10000, net_sats: 1990000, status: "released", created_at: new Date(Date.now() - 3600000).toISOString(), tx_id: "0xdef456" },
  { id: "pay_m3n4o5p6", merchant_id: "mer_001", amount_sats: 750000,  fee_sats: 3750, net_sats: 746250, status: "expired",   created_at: new Date(Date.now() - 90000000).toISOString(), tx_id: null },
];

export function Payments() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_PAYMENTS.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.id.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          marginBottom: 6,
        }}>
          Payments
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {MOCK_PAYMENTS.length} total payments
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all","pending","confirmed","released","expired"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              border: `1px solid ${filter === f ? "var(--accent)" : "var(--border2)"}`,
              background: filter === f ? "var(--accent)22" : "transparent",
              color: filter === f ? "var(--accent)" : "var(--muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
        <input
          placeholder="Search by payment ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, marginLeft: "auto" }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Payment ID","Amount","Fee","Net","Status","Created"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px",
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
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#ffffff06")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--accent)" }}>
                  {p.id}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12 }}>
                  {satsToBtc(p.amount_sats)} BTC
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--muted)" }}>
                  {p.fee_sats.toLocaleString()} sats
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--green)" }}>
                  {satsToBtc(p.net_sats)} BTC
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--muted)" }}>
                  {timeAgo(p.created_at)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                  No payments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}