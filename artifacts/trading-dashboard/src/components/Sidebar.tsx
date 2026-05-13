import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, TrendingUp, Zap, Building2, Wallet, FlaskConical,
  FileText, Settings, Bot, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BotStatus } from "@/hooks/useWebSocket";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: TrendingUp },
  { href: "/strategies", label: "Strategies", icon: Zap },
  { href: "/exchanges", label: "Exchanges", icon: Building2 },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/backtests", label: "Backtests", icon: FlaskConical },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const stateColors: Record<string, string> = {
  running: "text-emerald-400",
  stopped: "text-red-400",
  paused: "text-amber-400",
  error: "text-red-400",
};

interface SidebarProps {
  botStatus: BotStatus | null;
  wsConnected: boolean;
}

export function Sidebar({ botStatus, wsConnected }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold text-sidebar-foreground">CryptoBot</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Trading Platform</div>
        </div>
      </div>

      {/* Bot Status */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50">
          <Circle
            className={cn(
              "w-2 h-2 fill-current flex-shrink-0",
              botStatus ? stateColors[botStatus.state] : "text-muted-foreground"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-sidebar-foreground capitalize">
              {botStatus?.state ?? "Connecting..."}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize">
              {botStatus?.mode ?? "—"} mode
            </div>
          </div>
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", wsConnected ? "bg-emerald-400" : "bg-muted-foreground")} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Stats */}
      {botStatus && (
        <div className="px-3 pb-3 border-t border-sidebar-border pt-3">
          <div className="grid grid-cols-2 gap-1.5">
            <StatBadge label="Open" value={String(botStatus.openTrades)} />
            <StatBadge label="Strategies" value={String(botStatus.activeStrategies)} />
            <StatBadge label="Today" value={String(botStatus.totalTradesToday)} />
            <StatBadge label="Uptime" value={botStatus.state === "running" ? formatUptime(botStatus.uptime) : "—"} />
          </div>
        </div>
      )}
    </aside>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sidebar-accent/50 rounded px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold text-sidebar-foreground font-mono">{value}</div>
    </div>
  );
}

function formatUptime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
