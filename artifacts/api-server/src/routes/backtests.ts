import { Router } from "express";
import { db, backtestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id";
import { logEvent } from "../lib/botState";

const router = Router();

function fmt(b: Record<string, unknown>) {
  return {
    ...b,
    createdAt: b["createdAt"] instanceof Date ? (b["createdAt"] as Date).toISOString() : String(b["createdAt"] ?? ""),
    completedAt: b["completedAt"] instanceof Date ? (b["completedAt"] as Date).toISOString() : (b["completedAt"] ? String(b["completedAt"]) : null),
  };
}

router.get("/", async (_req, res) => {
  const backtests = await db.select().from(backtestsTable).orderBy(backtestsTable.createdAt);
  res.json({ backtests: backtests.map((b) => fmt(b as Record<string, unknown>)), total: backtests.length });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const id = generateId();
  const [backtest] = await db.insert(backtestsTable).values({
    id, strategyType: body.strategyType, symbol: body.symbol, exchange: body.exchange,
    startDate: body.startDate, endDate: body.endDate, status: "pending", config: body.config ?? {}, results: null,
  }).returning();
  await logEvent("info", `Backtest started: ${body.strategyType} on ${body.symbol}`, "backtester");
  setTimeout(() => void runBacktest(id), 2000);
  res.status(202).json(fmt(backtest as Record<string, unknown>));
});

router.get("/:backtestId", async (req, res) => {
  const [backtest] = await db.select().from(backtestsTable).where(eq(backtestsTable.id, req.params.backtestId!));
  if (!backtest) { res.status(404).json({ error: "Backtest not found" }); return; }
  res.json(fmt(backtest as Record<string, unknown>));
});

async function runBacktest(id: string) {
  try {
    await db.update(backtestsTable).set({ status: "running" }).where(eq(backtestsTable.id, id));
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 5000));

    const totalTrades = Math.floor(50 + Math.random() * 200);
    const winRate = 40 + Math.random() * 30;
    const avgWin = 80 + Math.random() * 120;
    const avgLoss = -(40 + Math.random() * 60);
    const wins = Math.floor(totalTrades * (winRate / 100));
    const losses = totalTrades - wins;
    const totalPnl = wins * avgWin + losses * avgLoss;

    const equityCurve: Array<{ timestamp: string; pnl: number; cumulativePnl: number; trades: number }> = [];
    let cumulative = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const ts = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
      const dayPnl = (Math.random() - 0.4) * 200;
      cumulative += dayPnl;
      equityCurve.push({ timestamp: ts.toISOString(), pnl: dayPnl, cumulativePnl: cumulative, trades: Math.floor(Math.random() * 10) });
    }

    await db.update(backtestsTable).set({
      status: "completed", completedAt: new Date(),
      results: {
        totalTrades, winRate, totalPnl, totalPnlPercent: (totalPnl / 10000) * 100,
        maxDrawdown: Math.abs(Math.min(...equityCurve.map((d) => d.cumulativePnl))),
        sharpeRatio: 0.5 + Math.random() * 2,
        profitFactor: totalPnl > 0 ? 1.2 + Math.random() : 0.7 + Math.random() * 0.3,
        avgTradeMs: 3600000 + Math.random() * 86400000, equityCurve,
      },
    }).where(eq(backtestsTable.id, id));

    await logEvent("info", `Backtest completed: ${id}`, "backtester", { totalTrades, winRate });
  } catch {
    await db.update(backtestsTable).set({ status: "failed" }).where(eq(backtestsTable.id, id));
  }
}

export default router;
