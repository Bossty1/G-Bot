import { useEffect, useRef, useState, useCallback } from "react";

export interface BotStatus {
  state: "running" | "stopped" | "paused" | "error";
  mode: "live" | "paper";
  startedAt: string | null;
  uptime: number;
  activeStrategies: number;
  openTrades: number;
  totalTradesToday: number;
  lastError: string | null;
  version: string;
}

interface WsMessage {
  type: string;
  data?: unknown;
}

interface UseWebSocketReturn {
  botStatus: BotStatus | null;
  connected: boolean;
  lastMessage: WsMessage | null;
}

const WS_URL = (() => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}${base}/api/ws`;
})();

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage;
          setLastMessage(msg);
          if (msg.type === "bot_status" && msg.data) {
            setBotStatus(msg.data as BotStatus);
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch { /* ignore connection errors */ }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { botStatus, connected, lastMessage };
}
