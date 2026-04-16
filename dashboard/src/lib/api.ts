const BASE = "/v1";

export async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export const statusColors: Record<string, string> = {
  pending:   "#eab308",
  confirmed: "#3b82f6",
  released:  "#22c55e",
  refunded:  "#a855f7",
  expired:   "#666666",
};

export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}