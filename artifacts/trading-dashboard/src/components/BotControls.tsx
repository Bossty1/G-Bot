import { useState } from "react";
import { Play, Square, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { BotStatus } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";

interface BotControlsProps {
  botStatus: BotStatus | null;
}

export function BotControls({ botStatus }: BotControlsProps) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const exec = async (action: string, body?: unknown) => {
    setLoading(true);
    try {
      await apiPost(`/bot/${action}`, body ?? {});
      await qc.invalidateQueries({ queryKey: ["bot-status"] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const state = botStatus?.state ?? "stopped";

  return (
    <div className="flex items-center gap-2">
      {state === "stopped" && (
        <>
          <Button size="sm" onClick={() => exec("start", { mode: "paper" })} disabled={loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
            <Play className="w-3.5 h-3.5" /> Paper
          </Button>
          <Button size="sm" onClick={() => exec("start", { mode: "live" })} disabled={loading}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-none">
            <Play className="w-3.5 h-3.5" /> Live
          </Button>
        </>
      )}
      {state === "running" && (
        <>
          <Button size="sm" variant="outline" onClick={() => exec("pause")} disabled={loading} className="gap-1.5">
            <Pause className="w-3.5 h-3.5" /> Pause
          </Button>
          <Button size="sm" onClick={() => exec("stop")} disabled={loading}
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none">
            <Square className="w-3.5 h-3.5" /> Stop
          </Button>
        </>
      )}
      {state === "paused" && (
        <>
          <Button size="sm" onClick={() => exec("resume")} disabled={loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
            <RotateCcw className="w-3.5 h-3.5" /> Resume
          </Button>
          <Button size="sm" onClick={() => exec("stop")} disabled={loading}
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none">
            <Square className="w-3.5 h-3.5" /> Stop
          </Button>
        </>
      )}
      {state === "error" && (
        <Button size="sm" onClick={() => exec("start", { mode: botStatus?.mode ?? "paper" })} disabled={loading}
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white border-none">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      )}
    </div>
  );
}

export function BotStateBadge({ state }: { state: string }) {
  const config = {
    running: { label: "Running", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    stopped: { label: "Stopped", className: "bg-red-500/10 text-red-500 border-red-500/20" },
    paused: { label: "Paused", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    error: { label: "Error", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  }[state] ?? { label: state, className: "bg-muted text-muted-foreground border-border" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
