import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiDelete } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Building2, Zap, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface Exchange {
  id: string; name: string; exchangeId: string; label: string; status: string;
  isTestnet: boolean; paperTrading: boolean; rateLimit: number;
  lastConnected: string | null; createdAt: string;
}

const STATUS_ICON = {
  connected: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  disconnected: <XCircle className="w-4 h-4 text-muted-foreground" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export default function Exchanges() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ exchangeId: "binance", label: "", apiKey: "", apiSecret: "", passphrase: "", isTestnet: true, paperTrading: true });
  const [supported, setSupported] = useState<string[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["exchanges"],
    queryFn: () => apiFetch<{ exchanges: Exchange[]; total: number }>("/exchanges"),
    refetchInterval: 15000,
  });

  const openAdd = async () => {
    const res = await apiFetch<{ exchanges: string[] }>("/exchanges/supported");
    setSupported(res.exchanges);
    setShowAdd(true);
  };

  const test = async (id: string) => {
    setTesting(id);
    try {
      await apiPost(`/exchanges/${id}/test`, {});
      qc.invalidateQueries({ queryKey: ["exchanges"] });
    } catch { /* ignore */ }
    setTesting(null);
  };

  const del = async (id: string) => {
    if (!confirm("Remove this exchange?")) return;
    await apiDelete(`/exchanges/${id}`);
    qc.invalidateQueries({ queryKey: ["exchanges"] });
  };

  const add = async () => {
    await apiPost("/exchanges", form);
    setShowAdd(false);
    setForm({ exchangeId: "binance", label: "", apiKey: "", apiSecret: "", passphrase: "", isTestnet: true, paperTrading: true });
    qc.invalidateQueries({ queryKey: ["exchanges"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Exchanges</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} exchanges configured</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Exchange</Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.exchanges ?? []).map((ex) => (
          <div key={ex.id} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{ex.label}</div>
                  <div className="text-xs text-muted-foreground">{ex.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {STATUS_ICON[ex.status as keyof typeof STATUS_ICON] ?? <XCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground capitalize">{ex.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ex.isTestnet && <span className="bg-amber-500/10 text-amber-500 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20">Testnet</span>}
              {ex.paperTrading && <span className="bg-blue-500/10 text-blue-500 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20">Paper</span>}
              <span className="bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded">RL: {ex.rateLimit}ms</span>
            </div>

            {ex.lastConnected && (
              <div className="text-xs text-muted-foreground">
                Last connected: {new Date(ex.lastConnected).toLocaleString()}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Button size="sm" variant="outline" onClick={() => test(ex.id)} disabled={testing === ex.id} className="gap-1.5 flex-1">
                <Zap className="w-3.5 h-3.5" />
                {testing === ex.id ? "Testing..." : "Test Connection"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(ex.id)} className="text-muted-foreground hover:text-red-500 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(data?.exchanges ?? []).length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No exchanges configured. Add one to get started.</div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Exchange</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Exchange</Label>
              <Select value={form.exchangeId} onValueChange={(v) => setForm({ ...form, exchangeId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {supported.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="My Binance Account" /></div>
            <div><Label>API Key</Label><Input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Your API key" /></div>
            <div><Label>API Secret</Label><Input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder="Your API secret" /></div>
            <div><Label>Passphrase (optional)</Label><Input value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} placeholder="For exchanges that require it" /></div>
            <div className="flex items-center justify-between">
              <Label>Testnet</Label>
              <Switch checked={form.isTestnet} onCheckedChange={(v) => setForm({ ...form, isTestnet: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Paper Trading</Label>
              <Switch checked={form.paperTrading} onCheckedChange={(v) => setForm({ ...form, paperTrading: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={add} disabled={!form.label || !form.apiKey || !form.apiSecret}>Add Exchange</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
