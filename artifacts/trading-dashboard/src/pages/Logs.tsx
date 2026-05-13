import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FileText, RefreshCw, AlertTriangle, Info, Bug, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

interface LogEntry {
  id: string; level: string; message: string; source: string;
  timestamp: string; metadata: Record<string, unknown> | null;
}

const LEVEL_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  debug: { icon: Bug, color: "text-muted-foreground", bg: "bg-muted/30" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/5" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/5" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/5" },
};

export default function Logs() {
  const [level, setLevel] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["logs", level],
    queryFn: () => apiFetch<{ logs: LogEntry[]; total: number }>(`/logs?${level !== "all" ? `level=${level}&` : ""}limit=200`),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Logs</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} log entries</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-1">
        {["all", "debug", "info", "warn", "error"].map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              level === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="bg-muted/20 border-b border-border px-4 py-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">System Log — Live</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="divide-y divide-border/30 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>}
          {!isLoading && (data?.logs ?? []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No logs found</div>
          )}
          {(data?.logs ?? []).map((log) => {
            const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG["info"]!;
            const Icon = cfg.icon;
            return (
              <div key={log.id} className={cn("flex items-start gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors", cfg.bg)}>
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-bold uppercase", cfg.color)}>{log.level}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono">{log.source}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-xs text-foreground font-mono mt-0.5 leading-relaxed">{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/30 rounded p-1.5 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
