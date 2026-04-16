import React from "react";
import { useApi }    from "../hooks/useApi.ts";
import { StatCard }  from "../components/StatCard.tsx";
import { satsToBtc } from "../lib/api.ts";

export function Overview() {
  const { data: status } = useApi<any>("/status", 15000);

  // Mock stats -- replace with real DB queries via API
  const stats = {
    total_payments:   24,
    confirmed:        18,
    total_volume_sats: 48_500_000,
    fees_collected:    242_500,
  };

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
          Overview
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Network: {status?.network ?? "..."} &nbsp;|&nbsp;
          Chain: {status?.chain_ok ? (
            <span style={{ color: "var(--green)" }}>connected</span>
          ) : (
            <span style={{ color: "var(--red)" }}>offline</span>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
        marginBottom: 40,
      }}>
        <StatCard
          label="Total Volume"
          value={`${satsToBtc(stats.total_volume_sats)} BTC`}
          sub={`${stats.total_payments} payments`}
          accent
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          sub="payments"
        />
        <StatCard
          label="Fees Collected"
          value={`${satsToBtc(stats.fees_collected)} BTC`}
          sub="0.5% protocol fee"
        />
        <StatCard
          label="Success Rate"
          value={`${Math.round((stats.confirmed / stats.total_payments) * 100)}%`}
          sub="confirmation rate"
        />
      </div>

      {/* Fee calculator */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "24px",
      }}>
        <div style={{
          fontFamily: "var(--font-head)",
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          Fee Calculator
        </div>
        {status?.fee_example && (
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 2 }}>
            <div>Amount: <span style={{ color: "var(--text)" }}>
              {status.fee_example.amount_sats.toLocaleString()} sats
            </span></div>
            <div>Protocol fee (0.5%): <span style={{ color: "var(--accent)" }}>
              {status.fee_example.fee_sats.toLocaleString()} sats
            </span></div>
            <div>Net to merchant: <span style={{ color: "var(--green)" }}>
              {(status.fee_example.amount_sats - status.fee_example.fee_sats).toLocaleString()} sats
            </span></div>
          </div>
        )}
      </div>
    </div>
  );
}