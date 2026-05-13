import { Router } from "express";
import { db, strategiesTable, tradesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { generateId } from "../lib/id";
import { logEvent, updateActiveStrategies } from "../lib/botState";

const router = Router();

async function enrichStrategy(s: Record<string, unknown>) {
  const trades = await db.select().from(tradesTable).where(eq(tradesTable.strategyId, s["id"] as string));
  const closed = trades.filter((t) => t.status === "closed");
  const winners = closed.filter((t) => parseFloat(t.pnl ?? "0") > 0);
  const totalPnl = closed.reduce((acc, t) => acc + parseFloat(t.pnl ?? "0"), 0);
  return {
    ...s,
    symbols: Array.isArray(s["symbols"]) ? s["symbols"] : [],
    config: typeof s["config"] === "object" ? s["config"] : {},
    riskConfig: s["riskConfig"] ?? defaultRiskConfig(),
    stats: { totalTrades: trades.length, winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0, totalPnl, avgPnl: closed.length > 0 ? totalPnl / closed.length : 0 },
    createdAt: s["createdAt"] instanceof Date ? (s["createdAt"] as Date).toISOString() : String(s["createdAt"] ?? ""),
    updatedAt: s["updatedAt"] instanceof Date ? (s["updatedAt"] as Date).toISOString() : String(s["updatedAt"] ?? ""),
  };
}

function defaultRiskConfig() {
  return { maxPositionSize: 100, maxOpenTrades: 5, dailyLossLimit: 500, tradeСooldownSeconds: 60, stopLossPercent: 2, takeProfitPercent: 4, trailingStopPercent: null };
}

async function refreshActiveCount() {
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(strategiesTable).where(eq(strategiesTable.status, "active"));
  updateActiveStrategies(Number(result?.count ?? 0));
}

router.get("/", async (_req, res) => {
  const strategies = await db.select().from(strategiesTable);
  const enriched = await Promise.all(strategies.map(enrichStrategy));
  res.json({ strategies: enriched, total: enriched.length });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const id = generateId();
  const [strategy] = await db.insert(strategiesTable).values({
    id, name: body.name, description: body.description ?? "", type: body.type, status: "inactive",
    exchangeId: body.exchangeId ?? null, symbols: body.symbols ?? [], config: body.config ?? {}, riskConfig: body.riskConfig ?? defaultRiskConfig(),
  }).returning();
  await logEvent("info", `Strategy created: ${body.name}`, "strategy-manager");
  res.status(201).json(await enrichStrategy(strategy as Record<string, unknown>));
});

router.get("/:strategyId", async (req, res) => {
  const [strategy] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, req.params.strategyId!));
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  res.json(await enrichStrategy(strategy as Record<string, unknown>));
});

router.put("/:strategyId", async (req, res) => {
  const body = req.body;
  const [strategy] = await db.update(strategiesTable)
    .set({ name: body.name, description: body.description, exchangeId: body.exchangeId, symbols: body.symbols, config: body.config, riskConfig: body.riskConfig, updatedAt: new Date() })
    .where(eq(strategiesTable.id, req.params.strategyId!)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  res.json(await enrichStrategy(strategy as Record<string, unknown>));
});

router.delete("/:strategyId", async (req, res) => {
  const [existing] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, req.params.strategyId!));
  if (!existing) { res.status(404).json({ error: "Strategy not found" }); return; }
  await db.delete(strategiesTable).where(eq(strategiesTable.id, req.params.strategyId!));
  await refreshActiveCount();
  res.status(204).end();
});

router.post("/:strategyId/activate", async (req, res) => {
  const [strategy] = await db.update(strategiesTable).set({ status: "active", updatedAt: new Date() }).where(eq(strategiesTable.id, req.params.strategyId!)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  await logEvent("info", `Strategy activated: ${strategy.name}`, "strategy-manager");
  await refreshActiveCount();
  res.json(await enrichStrategy(strategy as Record<string, unknown>));
});

router.post("/:strategyId/deactivate", async (req, res) => {
  const [strategy] = await db.update(strategiesTable).set({ status: "inactive", updatedAt: new Date() }).where(eq(strategiesTable.id, req.params.strategyId!)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  await logEvent("info", `Strategy deactivated: ${strategy.name}`, "strategy-manager");
  await refreshActiveCount();
  res.json(await enrichStrategy(strategy as Record<string, unknown>));
});

export default router;
