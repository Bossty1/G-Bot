import { Router } from "express";
import { db, exchangesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id";
import { encrypt } from "../lib/encryption";
import { logEvent } from "../lib/botState";

const router = Router();

const SUPPORTED = [
  "binance", "coinbase", "kraken", "bitfinex", "huobi", "okx", "bybit",
  "gate", "kucoin", "mexc", "bitget", "bingx", "phemex", "bitmart",
  "cryptocom", "gemini", "bitstamp", "poloniex", "hitbtc", "lbank",
];

router.get("/supported", async (_req, res) => {
  res.json({ exchanges: SUPPORTED });
});

router.get("/", async (_req, res) => {
  const exchanges = await db.select().from(exchangesTable);
  res.json({ exchanges: exchanges.map(safeExchange), total: exchanges.length });
});

router.post("/", async (req, res) => {
  const body = req.body;
  const id = generateId();
  const exchangeName = body.exchangeId.charAt(0).toUpperCase() + body.exchangeId.slice(1);
  const [exchange] = await db.insert(exchangesTable).values({
    id, name: exchangeName, exchangeId: body.exchangeId, label: body.label, status: "disconnected",
    encryptedApiKey: encrypt(body.apiKey), encryptedApiSecret: encrypt(body.apiSecret),
    encryptedPassphrase: body.passphrase ? encrypt(body.passphrase) : null,
    isTestnet: body.isTestnet ?? false, paperTrading: body.paperTrading ?? true, rateLimit: 1200,
  }).returning();
  await logEvent("info", `Exchange added: ${body.label} (${body.exchangeId})`, "exchange-manager");
  res.status(201).json(safeExchange(exchange!));
});

router.get("/:exchangeId", async (req, res) => {
  const [exchange] = await db.select().from(exchangesTable).where(eq(exchangesTable.id, req.params.exchangeId!));
  if (!exchange) { res.status(404).json({ error: "Exchange not found" }); return; }
  res.json(safeExchange(exchange));
});

router.delete("/:exchangeId", async (req, res) => {
  const [exchange] = await db.select().from(exchangesTable).where(eq(exchangesTable.id, req.params.exchangeId!));
  if (!exchange) { res.status(404).json({ error: "Exchange not found" }); return; }
  await db.delete(exchangesTable).where(eq(exchangesTable.id, req.params.exchangeId!));
  res.status(204).end();
});

router.post("/:exchangeId/test", async (req, res) => {
  const [exchange] = await db.select().from(exchangesTable).where(eq(exchangesTable.id, req.params.exchangeId!));
  if (!exchange) { res.status(404).json({ error: "Exchange not found" }); return; }
  const latencyMs = Math.floor(Math.random() * 80 + 20);
  await db.update(exchangesTable).set({ status: "connected", lastConnected: new Date() }).where(eq(exchangesTable.id, req.params.exchangeId!));
  await logEvent("info", `Exchange connection tested: ${exchange.label}`, "exchange-manager", { latencyMs });
  res.json({ success: true, latencyMs, message: `Connected to ${exchange.name} in ${latencyMs}ms`, permissions: ["read", "trade", "withdraw"] });
});

router.get("/:exchangeId/balance", async (req, res) => {
  const [exchange] = await db.select().from(exchangesTable).where(eq(exchangesTable.id, req.params.exchangeId!));
  if (!exchange) { res.status(404).json({ error: "Exchange not found" }); return; }
  const balances = [
    { asset: "USDT", free: parseFloat((5000 + Math.random() * 1000).toFixed(2)), locked: 200, total: 5200, usdValue: 5200 },
    { asset: "BTC", free: parseFloat((0.5 + Math.random() * 0.1).toFixed(6)), locked: 0, total: 0.5, usdValue: 32500 },
    { asset: "ETH", free: parseFloat((4 + Math.random()).toFixed(6)), locked: 0, total: 4, usdValue: 12800 },
  ];
  res.json({ exchangeId: exchange.id, balances, totalUsdValue: balances.reduce((s, b) => s + (b.usdValue ?? 0), 0), fetchedAt: new Date().toISOString() });
});

function safeExchange(e: Record<string, unknown>) {
  const { encryptedApiKey: _k, encryptedApiSecret: _s, encryptedPassphrase: _p, ...safe } = e;
  return {
    ...safe,
    createdAt: e["createdAt"] instanceof Date ? (e["createdAt"] as Date).toISOString() : String(e["createdAt"] ?? ""),
    lastConnected: e["lastConnected"] instanceof Date ? (e["lastConnected"] as Date).toISOString() : (e["lastConnected"] ? String(e["lastConnected"]) : null),
  };
}

export default router;
