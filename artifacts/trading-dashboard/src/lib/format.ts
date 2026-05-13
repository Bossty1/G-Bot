export function formatUsd(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPnl(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return formatUsd(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function pnlColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-muted-foreground";
  return value >= 0 ? "text-emerald-500" : "text-red-500";
}

export function pnlBg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500";
}
