import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api";
import { FlaskConical, Plus, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface Backtest {
  id: string; strategyType: string; symbol: string; exchange: string;
  startDate: string; endDate: string; status: string;
  results: {
    totalTrades: number; winRate: number; totalPnl: number; totalPnlPercent: number;
    maxDrawdown: number; sharpeRatio: number; profitFactor: number;
    equityCurve: Array<{ timestamp: string; pnl: number; cumulativePnl: number; trades: number }>;
  } | null;
  createdAt: string; completedAt: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  pending: { icon: Clock, color: "text-amber-400" },
  running: { icon: Loader2, color: "text-blue-400" },
  completed: { icon: CheckCircle, color: "text-emerald-400" },
  failed: { icon: XCircle, color: "text-red-400" },
};

const STRATEGY_TYPES = ["scalping", "momentum", "mean_reversion", "arbitrage", "grid", "dca"];

export default function Backtests() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Backtest | null>(null);
  const [form, setForm] = useState({
    strategyType: "scalping", symbol: "BTC/USDT", exchange: "binance",
    startDate: "2024-01-01", endDate: "2024-12-31",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["backtests"],
    queryFn: () => apiFetch<{ backtests: Backtest[]; total: number }>("/backtests"),
    refetchInterval: 5000,
  });

  const create = async () => {
    await apiPost("/backtests", form);
    setShowCreate(false);
    qc.invalidateQueries({ queryKey: ["backtests"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Backtests</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} backtests run</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Backtest</Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      <div className="space-y-3">
        {(data?.backtests ?? []).map((bt) => {
          const cfg = STATUS_CONFIG[bt.status] ?? STATUS_CONFIG["pending"]!;
          const Icon = cfg.icon;
          return (
            <div key={bt.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm capitalize">{bt.strategyType.replace("_", " ")} — {bt.symbol}</div>
                    <div className="text-xs text-muted-foreground">{bt.exchange} · {bt.startDate} → {bt.endDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn("flex items-center gap-1.5 text-xs", cfg.color)}>
                    <Icon className={cn("w-4 h-4", bt.status === "running" && "animate-spin")} />
                    <span className="capitalize">{bt.status}</span>
                  </div>
                  {bt.results && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(bt)}>View Results</Button>
                  )}
                </div>
              </div>

              {bt.results && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 pt-3 border-t border-border/50">
                  {[
                    { label: "Trades", value: String(bt.results.totalTrades) },
                    { label: "Win Rate", value: `${bt.results.winRate.toFixed(1)}%` },
                    { label: "P&L", value: formatUsd(bt.results.totalPnl), pos: bt.results.totalPnl >= 0 },
                    { label: "Max DD", value: formatUsd(bt.results.maxDrawdown) },
                    { label: "Sharpe", value: bt.results.sharpeRatio.toFixed(2) },
                    { label: "Profit F.", value: bt.results.profitFactor.toFixed(2) },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                      <div className={cn("text-xs font-bold font-mono", "pos" in m && m.pos !== undefined ? (m.pos ? "text-emerald-500" : "text-red-500") : "text-foreground")}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(data?.backtests ?? []).length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No backtests yet. Run your first one.</div>
      )}

      {/* Results Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Backtest Results — {selected?.symbol} {selected?.strategyType}</DialogTitle>
          </DialogHeader>
          {selected?.results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Trades", value: String(selected.results.totalTrades) },
                  { label: "Win Rate", value: `${selected.results.winRate.toFixed(1)}%` },
                  { label: "Total P&L", value: formatUsd(selected.results.totalPnl), pnl: true, pos: selected.results.totalPnl >= 0 },
                  { label: "Max Drawdown", value: formatUsd(selected.results.maxDrawdown) },
                  { label: "Sharpe Ratio", value: selected.results.sharpeRatio.toFixed(2) },
                  { label: "Profit Factor", value: selected.results.profitFactor.toFixed(2) },
                ].map((m) => (
                  <div key={m.label} className="bg-muted/30 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <div className={cn("text-lg font-bold font-mono", "pnl" in m && m.pnl ? (m.pos ? "text-emerald-500" : "text-red-500") : "")}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selected.results.equityCurve}>
                    <defs>
                      <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="timestamp" tickFormatter={(v) => format(new Date(v), "MM/dd")} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatUsd(v), "Cumulative PnL"]} />
                    <Area type="monotone" dataKey="cumulativePnl" stroke="hsl(217 91% 60%)" strokeWidth={2} fill="url(#ecGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Backtest</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Strategy Type</Label>
              <Select value={form.strategyType} onValueChange={(v) => setForm({ ...form, strategyType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Symbol</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="BTC/USDT" /></div>
            <div><Label>Exchange</Label><Input value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} placeholder="binance" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create}>Run Backtest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
