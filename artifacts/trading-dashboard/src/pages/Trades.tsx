import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api";
import { formatUsd, formatDate, pnlColor, pnlBg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Trade {
  id: string; symbol: string; side: string; orderType: string; status: string;
  exchangeId: string; exchangeName: string;
  entryPrice: number; exitPrice: number | null; quantity: number;
  totalCost: number; pnl: number | null; pnlPercent: number | null; fees: number;
  stopLoss: number | null; takeProfit: number | null;
  mode: string; openedAt: string; closedAt: string | null;
  strategyName?: string;
}

interface TradesResponse {
  trades: Trade[]; total: number; limit: number; offset: number;
}

interface TradeStats {
  totalTrades: number; openTrades: number; closedTrades: number;
  winningTrades: number; losingTrades: number; winRate: number;
  totalPnl: number; avgPnl: number; profitFactor: number;
  bestTrade: number; worstTrade: number; totalFees: number; totalVolume: number;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  closed: "bg-muted/50 text-muted-foreground border-border",
  cancelled: "bg-muted/50 text-muted-foreground border-border",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function Trades() {
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trades", filter],
    queryFn: () => apiFetch<TradesResponse>(`/trades?${filter !== "all" ? `status=${filter}&` : ""}limit=100`),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ["trade-stats"],
    queryFn: () => apiFetch<TradeStats>("/trades/stats"),
    refetchInterval: 15000,
  });

  const closeTrade = async (tradeId: string) => {
    try {
      await apiPost(`/trades/${tradeId}/close`, {});
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["trade-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Trades</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total trades</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total P&L", value: formatUsd(stats?.totalPnl ?? 0), pos: (stats?.totalPnl ?? 0) >= 0 },
          { label: "Win Rate", value: `${(stats?.winRate ?? 0).toFixed(1)}%`, pos: true },
          { label: "Open Trades", value: String(stats?.openTrades ?? 0), pos: true },
          { label: "Total Volume", value: formatUsd(stats?.totalVolume ?? 0, 0), pos: true },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={cn("text-lg font-bold font-mono mt-1", s.pos && s.label.includes("P&L") ? "text-emerald-500" : "")}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1">
        {(["all", "open", "closed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Symbol", "Side", "Type", "Status", "Entry", "Exit", "Qty", "P&L", "Fees", "Opened", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              )}
              {!isLoading && (data?.trades ?? []).length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">No trades found</td></tr>
              )}
              {(data?.trades ?? []).map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-bold uppercase", trade.side === "buy" ? "text-emerald-500" : "text-red-500")}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{trade.orderType}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize", STATUS_COLORS[trade.status] ?? "")}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">${trade.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{trade.quantity}</td>
                  <td className="px-4 py-3">
                    {trade.pnl !== null ? (
                      <span className={cn("font-mono text-xs font-bold", pnlColor(trade.pnl))}>
                        {trade.pnl >= 0 ? "+" : ""}{formatUsd(trade.pnl)}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatUsd(trade.fees)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(trade.openedAt)}</td>
                  <td className="px-4 py-3">
                    {trade.status === "open" && (
                      <Button size="sm" variant="ghost" onClick={() => closeTrade(trade.id)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3 mr-1" /> Close
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
