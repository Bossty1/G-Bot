import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiDelete } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Zap, Play, Square, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Strategy {
  id: string; name: string; description: string; type: string; status: string;
  symbols: string[]; exchangeId: string | null;
  stats: { totalTrades: number; winRate: number; totalPnl: number; avgPnl: number };
  createdAt: string; updatedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  inactive: "bg-muted/50 text-muted-foreground border-border",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STRATEGY_TYPES = ["scalping", "momentum", "mean_reversion", "arbitrage", "grid", "dca"];

export default function Strategies() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "scalping", symbols: "BTC/USDT" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["strategies"],
    queryFn: () => apiFetch<{ strategies: Strategy[]; total: number }>("/strategies"),
    refetchInterval: 15000,
  });

  const toggle = async (s: Strategy) => {
    const action = s.status === "active" ? "deactivate" : "activate";
    await apiPost(`/strategies/${s.id}/${action}`, {});
    qc.invalidateQueries({ queryKey: ["strategies"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this strategy?")) return;
    await apiDelete(`/strategies/${id}`);
    qc.invalidateQueries({ queryKey: ["strategies"] });
  };

  const create = async () => {
    await apiPost("/strategies", {
      ...form,
      symbols: form.symbols.split(",").map((s) => s.trim()),
    });
    setShowCreate(false);
    setForm({ name: "", description: "", type: "scalping", symbols: "BTC/USDT" });
    qc.invalidateQueries({ queryKey: ["strategies"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Strategies</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} strategies configured</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Strategy
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.strategies ?? []).map((s) => (
          <div key={s.id} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.description || "No description"}</div>
                </div>
              </div>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize", STATUS_STYLE[s.status] ?? "")}>
                {s.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {s.symbols.map((sym) => (
                <span key={sym} className="bg-muted/60 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-mono">{sym}</span>
              ))}
              <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded capitalize">{s.type.replace("_", " ")}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="Trades" value={String(s.stats.totalTrades)} />
              <Metric label="Win Rate" value={`${s.stats.winRate.toFixed(1)}%`} />
              <Metric label="Total P&L" value={`${s.stats.totalPnl >= 0 ? "+" : ""}$${s.stats.totalPnl.toFixed(2)}`}
                valueClass={s.stats.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"} />
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Button size="sm" variant="outline" onClick={() => toggle(s)} className="gap-1.5 flex-1">
                {s.status === "active"
                  ? <><Square className="w-3 h-3" /> Deactivate</>
                  : <><Play className="w-3 h-3" /> Activate</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(s.id)} className="text-muted-foreground hover:text-red-500 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(data?.strategies ?? []).length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No strategies yet. Create your first one.</div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Strategy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BTC Scalper" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Symbols (comma-separated)</Label><Input value={form.symbols} onChange={(e) => setForm({ ...form, symbols: e.target.value })} placeholder="BTC/USDT, ETH/USDT" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xs font-bold font-mono mt-0.5", valueClass || "text-foreground")}>{value}</div>
    </div>
  );
}
