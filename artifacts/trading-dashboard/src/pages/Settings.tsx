import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPut } from "@/lib/api";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface AppSettings {
  defaultMode: string;
  globalRisk: {
    maxPositionSize: number; maxOpenTrades: number; dailyLossLimit: number;
    stopLossPercent: number; takeProfitPercent: number; trailingStopPercent: number | null;
  };
  notifications: {
    telegramEnabled: boolean; telegramChatId: string | null;
    discordEnabled: boolean; discordWebhookUrl: string | null;
    notifyOnOpen: boolean; notifyOnClose: boolean; notifyOnError: boolean; notifyOnProfit: boolean;
  };
  websocket: { enabled: boolean; reconnectIntervalMs: number };
}

export default function Settings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<AppSettings>("/settings"),
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiPut("/settings", {
        defaultMode: settings.defaultMode,
        globalRisk: settings.globalRisk,
        notifications: settings.notifications,
      });
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const risk = settings.globalRisk;
  const notif = settings.notifications;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your trading bot</p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* General */}
      <Section title="General">
        <div>
          <Label>Default Mode</Label>
          <Select value={settings.defaultMode} onValueChange={(v) => setSettings({ ...settings, defaultMode: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paper">Paper Trading</SelectItem>
              <SelectItem value="live">Live Trading</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Paper mode uses simulated funds. Live mode places real orders.</p>
        </div>
      </Section>

      {/* Risk Management */}
      <Section title="Risk Management">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Position Size ($)" value={String(risk.maxPositionSize)}
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, maxPositionSize: parseFloat(v) || 0 } })} />
          <Field label="Max Open Trades" value={String(risk.maxOpenTrades)}
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, maxOpenTrades: parseInt(v) || 0 } })} />
          <Field label="Daily Loss Limit ($)" value={String(risk.dailyLossLimit)}
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, dailyLossLimit: parseFloat(v) || 0 } })} />
          <Field label="Stop Loss (%)" value={String(risk.stopLossPercent)}
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, stopLossPercent: parseFloat(v) || 0 } })} />
          <Field label="Take Profit (%)" value={String(risk.takeProfitPercent)}
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, takeProfitPercent: parseFloat(v) || 0 } })} />
          <Field label="Trailing Stop (%)" value={String(risk.trailingStopPercent ?? "")} placeholder="Disabled"
            onChange={(v) => setSettings({ ...settings, globalRisk: { ...risk, trailingStopPercent: v ? parseFloat(v) : null } })} />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="space-y-4">
          <Toggle label="Telegram" sub="Send alerts via Telegram bot"
            checked={notif.telegramEnabled}
            onChange={(v) => setSettings({ ...settings, notifications: { ...notif, telegramEnabled: v } })} />
          {notif.telegramEnabled && (
            <Field label="Telegram Chat ID" value={notif.telegramChatId ?? ""}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, telegramChatId: v || null } })} />
          )}
          <Toggle label="Discord" sub="Send alerts to a Discord webhook"
            checked={notif.discordEnabled}
            onChange={(v) => setSettings({ ...settings, notifications: { ...notif, discordEnabled: v } })} />
          {notif.discordEnabled && (
            <Field label="Discord Webhook URL" value={notif.discordWebhookUrl ?? ""}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, discordWebhookUrl: v || null } })} />
          )}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <Toggle label="Trade Opened" checked={notif.notifyOnOpen}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, notifyOnOpen: v } })} />
            <Toggle label="Trade Closed" checked={notif.notifyOnClose}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, notifyOnClose: v } })} />
            <Toggle label="Errors" checked={notif.notifyOnError}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, notifyOnError: v } })} />
            <Toggle label="Profitable Trades" checked={notif.notifyOnProfit}
              onChange={(v) => setSettings({ ...settings, notifications: { ...notif, notifyOnProfit: v } })} />
          </div>
        </div>
      </Section>

      {/* WebSocket */}
      <Section title="WebSocket">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Real-time Updates</div>
            <div className="text-xs text-muted-foreground">Enable WebSocket for live dashboard updates</div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            {settings.websocket.enabled ? `Reconnect: ${settings.websocket.reconnectIntervalMs}ms` : "Disabled"}
          </span>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
