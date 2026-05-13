import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatUsd, formatPct, formatDate } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { BotControls, BotStateBadge } from "@/components/BotControls";
import type { BotStatus } from "@/hooks/useWebSocket";
import {
  DollarSign, TrendingUp, Activity, BarChart3, Layers,
  Wallet, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { format } from "date-fns";

interface DashboardSummary {
  totalPnl: number; totalPnlPercent: number; todayPnl: number;
  weekPnl: number; openTrades: number; closedTrades: number; winRate: number;
  totalVolume: number; activeExchanges: number; totalWallets: number;
  totalBalance: number; botState: string;
  bestTrade: { id: string; symbol: string; pnl: number; pnlPercent: number } | null;
  worstTrade: { id: string; symbol: string; pnl: number; pnlPercent: number } | null;
}

interface PnlPoint { timestamp: string; pnl: number; cumulativePnl: number; trades: number }

interface ActivityItem {
  id: string; type: string; message: string; timestamp: string;
}

interface Props { botStatus: BotStatus | null }

export default function Dashboard({ botStatus }: Props) {
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard/summary"),
    refetchInterval: 10000,
  });

  const { data: pnlData } = useQuery({
    queryKey: ["dashboard-pnl", "7d"],
    queryFn: () => apiFetch<{ period: string; dataPoints: PnlPoint[] }>("/dashboard/pnl?period=7d"),
    refetchInterval: 30000,
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiFetch<{ items: ActivityItem[] }>("/dashboard/activity?limit=10"),
    refetchInterval: 10000,
  });

  const pnlPos = (summary?.totalPnl ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time trading overview</p>
        </div>
        <div className="flex items-center gap-3">
          <BotStateBadge state={botStatus?.state ?? "stopped"} />
          <BotControls botStatus={botStatus} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total P&L"
          value={formatUsd(summary?.totalPnl ?? 0)}
          sub={formatPct(summary?.totalPnlPercent ?? 0)}
          icon={DollarSign}
          trend={pnlPos ? "up" : "down"}
          valueClassName={pnlPos ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard
          title="Today P&L"
          value={formatUsd(summary?.todayPnl ?? 0)}
          sub="24h performance"
          icon={TrendingUp}
          trend={(summary?.todayPnl ?? 0) >= 0 ? "up" : "down"}
          valueClassName={(summary?.todayPnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard
          title="Win Rate"
          value={`${(summary?.winRate ?? 0).toFixed(1)}%`}
          sub={`${summary?.closedTrades ?? 0} closed trades`}
          icon={Activity}
          trend="neutral"
        />
        <StatCard
          title="Portfolio"
          value={formatUsd(summary?.totalBalance ?? 0, 0)}
          sub={`${summary?.openTrades ?? 0} open positions`}
          icon={BarChart3}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PnL Chart */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">P&L — Last 7 Days</h2>
            <span className={`text-sm font-mono font-bold ${(summary?.weekPnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatUsd(summary?.weekPnl ?? 0)}
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlData?.dataPoints ?? []} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v) => format(new Date(v), "MM/dd")}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false} tickLine={false} width={50}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => format(new Date(v as string), "MMM dd, HH:mm")}
                  formatter={(v: number) => [formatUsd(v), "Cumulative PnL"]}
                />
                <Area
                  type="monotone" dataKey="cumulativePnl"
                  stroke="hsl(217 91% 60%)" strokeWidth={2}
                  fill="url(#pnlGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h2>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {(activity?.items ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
            )}
            {(activity?.items ?? []).map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-foreground leading-snug truncate">{item.message}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Exchanges</h3>
          </div>
          <div className="text-2xl font-bold font-mono">{summary?.activeExchanges ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Connected</div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Wallets</h3>
          </div>
          <div className="text-2xl font-bold font-mono">{summary?.totalWallets ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Managed</div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Volume</h3>
          </div>
          <div className="text-2xl font-bold font-mono">{formatUsd(summary?.totalVolume ?? 0, 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">All-time traded</div>
        </div>
      </div>

      {/* Best / Worst */}
      {(summary?.bestTrade || summary?.worstTrade) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary?.bestTrade && (
            <div className="bg-card border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Best Trade</span>
              </div>
              <div className="font-mono font-bold text-lg text-foreground">{summary.bestTrade.symbol}</div>
              <div className="text-emerald-500 font-mono font-bold text-xl">{formatUsd(summary.bestTrade.pnl)}</div>
              <div className="text-xs text-muted-foreground">{formatPct(summary.bestTrade.pnlPercent)}</div>
            </div>
          )}
          {summary?.worstTrade && (
            <div className="bg-card border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Worst Trade</span>
              </div>
              <div className="font-mono font-bold text-lg text-foreground">{summary.worstTrade.symbol}</div>
              <div className="text-red-500 font-mono font-bold text-xl">{formatUsd(summary.worstTrade.pnl)}</div>
              <div className="text-xs text-muted-foreground">{formatPct(summary.worstTrade.pnlPercent)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
