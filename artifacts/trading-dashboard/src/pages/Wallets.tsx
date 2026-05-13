import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiDelete } from "@/lib/api";
import { Wallet, Plus, Trash2, RefreshCw, Download, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WalletEntry {
  id: string; label: string; chain: string; address: string;
  isImported: boolean; createdAt: string;
}

const CHAINS = ["ethereum", "bsc", "solana", "bitcoin", "polygon"];

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bsc: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  solana: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  bitcoin: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  polygon: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const CHAIN_SYMBOLS: Record<string, string> = {
  ethereum: "ETH", bsc: "BNB", solana: "SOL", bitcoin: "BTC", polygon: "MATIC",
};

export default function Wallets() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ label: "", chain: "ethereum" });
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallets"],
    queryFn: () => apiFetch<{ wallets: WalletEntry[]; total: number }>("/wallets"),
    refetchInterval: 30000,
  });

  const create = async () => {
    await apiPost("/wallets", form);
    setShowCreate(false);
    setForm({ label: "", chain: "ethereum" });
    qc.invalidateQueries({ queryKey: ["wallets"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this wallet? This cannot be undone.")) return;
    await apiDelete(`/wallets/${id}`);
    qc.invalidateQueries({ queryKey: ["wallets"] });
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Wallets</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} wallets managed</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Generate Wallet</Button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.wallets ?? []).map((w) => (
          <div key={w.id} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                  {CHAIN_SYMBOLS[w.chain] ?? "?"}
                </div>
                <div>
                  <div className="font-semibold text-sm">{w.label}</div>
                  <div className="text-xs text-muted-foreground capitalize">{w.chain}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border capitalize", CHAIN_COLORS[w.chain] ?? "bg-muted text-muted-foreground border-border")}>
                  {w.chain}
                </span>
                {w.isImported && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border">Imported</span>
                )}
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground truncate">{w.address}</span>
              <button onClick={() => copy(w.address, w.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                {copied === w.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              Created {new Date(w.createdAt).toLocaleDateString()}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Button size="sm" variant="ghost" onClick={() => del(w.id)} className="text-muted-foreground hover:text-red-500 gap-1.5 flex-1 justify-center">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(data?.wallets ?? []).length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No wallets yet. Generate a new one.</div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate New Wallet</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A new wallet will be generated with an encrypted private key stored securely in the database.</p>
          <div className="space-y-3">
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="My ETH Wallet" /></div>
            <div>
              <Label>Chain</Label>
              <Select value={form.chain} onValueChange={(v) => setForm({ ...form, chain: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHAINS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.label}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
