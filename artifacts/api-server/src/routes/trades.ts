import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { generateId } from "../lib/id";
import { logEvent, incrementTradesToday } from "../lib/botState";

const router = Router();

router.get("/stats", async (_req, res) => {
  const trades = await db.select().from(tradesTable);
  const closed = trades.filter((t) => t.status === "closed");
  const winners = closed.filter((t) => t.pnl && parseFloat(t.pnl) > 0);
  const losers = closed.filter((t) => t.pnl && parseFloat(t.pnl) <= 0);
  const totalPnl = closed.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0);
  const avgWin = winners.length ? winners.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0) / winners.length : 0;
  const avgLoss = losers.length ? losers.reduce((s, t) => s + parseFloat(t.pnl ?? "0"), 0) / losers.length : 0;
  const totalFees = trades.reduce((s, t) => s + parseFloat(t.fees ?? "0"), 0);
  const totalVolume = trades.reduce((s, t) => s + parseFloat(t.totalCost ?? "0"), 0);
  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin * winners.length) / Math.abs(avgLoss * losers.length) : 0;
  const bestTrade = Math.max(...closed.map((t) => parseFloat(t.pnl ?? "0")), 0);
  const worstTrade = Math.min(...closed.map((t) => parseFloat(t.pnl ?? "0")), 0);

  res.json({
    totalTrades: trades.length,
    openTrades: trades.filter((t) => t.status === "open").length,
    closedTrades: closed.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    totalPnl,
    avgPnl: closed.length ? totalPnl / closed.length : 0,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown: 0,
    bestTrade,
    worstTrade,
    avgDuration: 0,
    totalFees,
    totalVolume,
  });
});

router.get("/", async (req, res) => {
  const { status, exchange, symbol, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit), 200);
  const off = parseInt(offset);

  let query = db.select().from(tradesTable).$dynamic();
  const conditions = [];
  if (status && status !== "all") conditions.push(eq(tradesTable.status, status as "open" | "closed" | "cancelled" | "pending"));
  if (exchange) conditions.push(eq(tradesTable.exchangeId, exchange));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const trades = await query.orderBy(desc(tradesTable.openedAt)).limit(lim).offset(off);
  const total = await db.select({ count: sql<number>`count(*)` }).from(tradesTable);

  res.json({
    trades: trades.map(serializeTrade),
    total: Number(total[0]?.count ?? 0),
    limit: lim,
    offset: off,
  });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const id = generateId();
  const entryPrice = body.price ?? 50000;
  const quantity = body.quantity ?? 0.01;
  const totalCost = entryPrice * quantity;

  const [trade] = await db
    .insert(tradesTable)
    .values({
      id,
      exchangeId: body.exchangeId,
      exchangeName: body.exchangeId,
      symbol: body.symbol,
      side: body.side,
      orderType: body.orderType ?? "market",
      status: "open",
      entryPrice: String(entryPrice),
      quantity: String(quantity),
      totalCost: String(totalCost),
      fees: "0",
      stopLoss: body.stopLoss ? String(body.stopLoss) : null,
      takeProfit: body.takeProfit ? String(body.takeProfit) : null,
      trailingStop: body.trailingStop ? String(body.trailingStop) : null,
      mode: "paper",
    })
    .returning();

  await logEvent("info", `Trade opened: ${body.side} ${body.symbol}`, "trading-engine", { tradeId: id });
  incrementTradesToday();
  res.status(201).json(serializeTrade(trade!));
});

router.get("/:tradeId", async (req, res) => {
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, req.params.tradeId!));
  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }
  res.json(serializeTrade(trade));
});

router.post("/:tradeId/close", async (req, res) => {
  const [existing] = await db.select().from(tradesTable).where(eq(tradesTable.id, req.params.tradeId!));
  if (!existing) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  const exitPrice = req.body?.price ?? parseFloat(existing.entryPrice) * (1 + (Math.random() * 0.04 - 0.02));
  const entryPrice = parseFloat(existing.entryPrice);
  const qty = parseFloat(existing.quantity);
  const pnl = existing.side === "buy" ? (exitPrice - entryPrice) * qty : (entryPrice - exitPrice) * qty;
  const pnlPercent = (pnl / (entryPrice * qty)) * 100;

  const [trade] = await db
    .update(tradesTable)
    .set({
      status: "closed",
      exitPrice: String(exitPrice),
      pnl: String(pnl),
      pnlPercent: String(pnlPercent),
      closedAt: new Date(),
    })
    .where(eq(tradesTable.id, req.params.tradeId!))
    .returning();

  await logEvent("info", `Trade closed: ${existing.symbol} PnL: ${pnl.toFixed(4)}`, "trading-engine", { tradeId: existing.id, pnl });
  res.json(serializeTrade(trade!));
});

function serializeTrade(t: Record<string, unknown>) {
  return {
    ...t,
    entryPrice: parseFloat(String(t["entryPrice"] ?? "0")),
    exitPrice: t["exitPrice"] ? parseFloat(String(t["exitPrice"])) : null,
    quantity: parseFloat(String(t["quantity"] ?? "0")),
    totalCost: parseFloat(String(t["totalCost"] ?? "0")),
    pnl: t["pnl"] ? parseFloat(String(t["pnl"])) : null,
    pnlPercent: t["pnlPercent"] ? parseFloat(String(t["pnlPercent"])) : null,
    fees: parseFloat(String(t["fees"] ?? "0")),
    stopLoss: t["stopLoss"] ? parseFloat(String(t["stopLoss"])) : null,
    takeProfit: t["takeProfit"] ? parseFloat(String(t["takeProfit"])) : null,
    trailingStop: t["trailingStop"] ? parseFloat(String(t["trailingStop"])) : null,
    openedAt: t["openedAt"] instanceof Date ? (t["openedAt"] as Date).toISOString() : String(t["openedAt"] ?? ""),
    closedAt: t["closedAt"] instanceof Date ? (t["closedAt"] as Date).toISOString() : (t["closedAt"] ? String(t["closedAt"]) : null),
  };
}

export default router;
