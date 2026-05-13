import { Router } from "express";
import { db, tradesTable, walletsTable, exchangesTable } from "@workspace/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import { getBotStatus } from "../lib/botState";
import { logsTable } from "@workspace/db";

const router = Router();

router.get("/summary", async (_req, res) => {
  const trades = await db.select().from(tradesTable);
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");
  const winners = closed.filter((t) => parseFloat(t.pnl ?? "0") > 0);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayTrades = closed.filter((t) => t.closedAt && new Date(t.closedAt) >= todayStart);
  const weekTrades = closed.filter((t) => t.closedAt && new Date(t.closedAt) >= weekStart);

  const totalPnl = closed.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
  const todayPnl = todayTrades.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
  const weekPnl = weekTrades.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
  const totalVolume = trades.reduce((s, t) => s + parseFloat(t.totalCost ?? "0"), 0);

  const [walletsResult] = await db.select({ count: sql<number>`count(*)` }).from(walletsTable);
  const [exchangesResult] = await db.select({ count: sql<number>`count(*)` }).from(exchangesTable).where(eq(exchangesTable.status, "connected"));

  const sortedByPnl = [...closed].sort((a, b) => parseFloat(b.pnl ?? "0") - parseFloat(a.pnl ?? "0"));
  const bestTrade = sortedByPnl[0];
  const worstTrade = sortedByPnl[sortedByPnl.length - 1];

  const botStatus = getBotStatus();

  res.json({
    totalPnl,
    totalPnlPercent: totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0,
    todayPnl,
    todayPnlPercent: 0,
    weekPnl,
    openTrades: open.length,
    closedTrades: closed.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    totalVolume,
    activeExchanges: Number(exchangesResult?.count ?? 0),
    totalWallets: Number(walletsResult?.count ?? 0),
    totalBalance: 50500,
    botState: botStatus.state,
    bestTrade: bestTrade
      ? { id: bestTrade.id, symbol: bestTrade.symbol, pnl: parseFloat(bestTrade.pnl ?? "0"), pnlPercent: parseFloat(bestTrade.pnlPercent ?? "0") }
      : null,
    worstTrade: worstTrade && worstTrade !== bestTrade
      ? { id: worstTrade.id, symbol: worstTrade.symbol, pnl: parseFloat(worstTrade.pnl ?? "0"), pnlPercent: parseFloat(worstTrade.pnlPercent ?? "0") }
      : null,
  });
});

router.get("/pnl", async (req, res) => {
  const period = (req.query["period"] as string) ?? "7d";
  const periodMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90, all: 365 };
  const days = periodMap[period] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const trades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.status, "closed"))
    .orderBy(tradesTable.closedAt);

  const dataPoints: Array<{ timestamp: string; pnl: number; cumulativePnl: number; trades: number }> = [];
  let cumulative = 0;

  const filtered = trades.filter((t) => t.closedAt && new Date(t.closedAt) >= since);
  for (const t of filtered) {
    const pnl = parseFloat(t.pnl ?? "0");
    cumulative += pnl;
    dataPoints.push({
      timestamp: t.closedAt ? (t.closedAt as Date).toISOString() : new Date().toISOString(),
      pnl,
      cumulativePnl: cumulative,
      trades: 1,
    });
  }

  if (dataPoints.length === 0) {
    const now = new Date();
    for (let i = days; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dataPoints.push({ timestamp: ts.toISOString(), pnl: 0, cumulativePnl: 0, trades: 0 });
    }
  }

  res.json({ period, dataPoints });
});

router.get("/activity", async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "20"), 100);
  const logs = await db
    .select()
    .from(logsTable)
    .orderBy(desc(logsTable.timestamp))
    .limit(limit);

  const typeMap: Record<string, string> = {
    "bot": "bot_started",
    "trading-engine": "trade_opened",
    "strategy-manager": "strategy_activated",
    "exchange-manager": "exchange_connected",
    "wallet-manager": "wallet_created",
  };

  res.json({
    items: logs.map((l) => ({
      id: l.id,
      type: typeMap[l.source] ?? "trade_opened",
      message: l.message,
      timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : String(l.timestamp),
      metadata: l.metadata ?? {},
    })),
  });
});

export default router;
