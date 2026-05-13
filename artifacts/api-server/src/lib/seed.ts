import { db } from "@workspace/db";
import { tradesTable, walletsTable, strategiesTable, exchangesTable, logsTable, settingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { generateId } from "./id";
import { encrypt } from "./encryption";
import { logger } from "./logger";

export async function seedInitialData() {
  const [{ count: tradeCount }] = await db.select({ count: sql<number>`count(*)` }).from(tradesTable);
  if (Number(tradeCount) > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding initial data...");

  await db.insert(settingsTable).values({
    id: "singleton",
    defaultMode: "paper",
    globalRisk: { maxPositionSize: 100, maxOpenTrades: 5, dailyLossLimit: 500, tradeCooldownSeconds: 60, stopLossPercent: 2, takeProfitPercent: 4, trailingStopPercent: null },
    notifications: { telegramEnabled: false, telegramChatId: null, discordEnabled: false, discordWebhookUrl: null, notifyOnOpen: true, notifyOnClose: true, notifyOnError: true, notifyOnProfit: true },
    websocketEnabled: true,
    websocketReconnectIntervalMs: "5000",
  }).onConflictDoNothing();

  const exchangeId = generateId();
  await db.insert(exchangesTable).values({
    id: exchangeId,
    name: "Binance",
    exchangeId: "binance",
    label: "Binance Paper",
    status: "connected",
    encryptedApiKey: encrypt("demo-api-key"),
    encryptedApiSecret: encrypt("demo-api-secret"),
    isTestnet: true,
    paperTrading: true,
    rateLimit: 1200,
    lastConnected: new Date(),
  }).onConflictDoNothing();

  const strategyId1 = generateId();
  const strategyId2 = generateId();
  await db.insert(strategiesTable).values([
    {
      id: strategyId1,
      name: "BTC Scalper",
      description: "High-frequency scalping on BTC/USDT using RSI and Bollinger Bands",
      type: "scalping",
      status: "active",
      exchangeId,
      symbols: ["BTC/USDT"],
      config: { rsiPeriod: 14, bbPeriod: 20, bbStdDev: 2 },
      riskConfig: { maxPositionSize: 50, maxOpenTrades: 3, dailyLossLimit: 200, tradeCooldownSeconds: 30, stopLossPercent: 1.5, takeProfitPercent: 3, trailingStopPercent: null },
    },
    {
      id: strategyId2,
      name: "ETH Momentum",
      description: "Momentum trading on ETH/USDT using MACD crossover signals",
      type: "momentum",
      status: "inactive",
      exchangeId,
      symbols: ["ETH/USDT", "BNB/USDT"],
      config: { macdFast: 12, macdSlow: 26, macdSignal: 9 },
      riskConfig: { maxPositionSize: 100, maxOpenTrades: 5, dailyLossLimit: 500, tradeCooldownSeconds: 60, stopLossPercent: 2, takeProfitPercent: 5, trailingStopPercent: 1.5 },
    },
  ]).onConflictDoNothing();

  const walletId = generateId();
  await db.insert(walletsTable).values({
    id: walletId,
    label: "Primary ETH Wallet",
    chain: "ethereum",
    address: "0x742d35Cc6634C0532925a3b8D4C9B3E3B5A4F21e",
    encryptedPrivateKey: encrypt("demo-private-key"),
    encryptedMnemonic: encrypt("word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"),
    isImported: false,
  }).onConflictDoNothing();

  const now = new Date();
  const trades = [
    { symbol: "BTC/USDT", side: "buy" as const, entry: 62450, exit: 63820, qty: 0.05, days: 5, pnl: 68.5 },
    { symbol: "ETH/USDT", side: "buy" as const, entry: 3180, exit: 3420, qty: 0.8, days: 3, pnl: 192 },
    { symbol: "BNB/USDT", side: "sell" as const, entry: 620, exit: 595, qty: 2, days: 2, pnl: 50 },
    { symbol: "SOL/USDT", side: "buy" as const, entry: 175, exit: 162, qty: 5, days: 1, pnl: -65 },
    { symbol: "BTC/USDT", side: "buy" as const, entry: 61200, exit: null, qty: 0.02, days: 0, pnl: null },
    { symbol: "ETH/USDT", side: "sell" as const, entry: 3350, exit: null, qty: 0.5, days: 0, pnl: null },
  ];

  for (const t of trades) {
    const openedAt = new Date(now.getTime() - t.days * 24 * 60 * 60 * 1000 - 3600000);
    const closedAt = t.exit ? new Date(now.getTime() - t.days * 24 * 60 * 60 * 1000) : null;
    const totalCost = t.entry * t.qty;
    const pnlPct = t.pnl && totalCost ? (t.pnl / totalCost) * 100 : null;

    await db.insert(tradesTable).values({
      id: generateId(),
      exchangeId,
      exchangeName: "Binance",
      symbol: t.symbol,
      side: t.side,
      orderType: "market",
      status: t.exit ? "closed" : "open",
      strategyId: strategyId1,
      strategyName: "BTC Scalper",
      entryPrice: String(t.entry),
      exitPrice: t.exit ? String(t.exit) : null,
      quantity: String(t.qty),
      totalCost: String(totalCost),
      pnl: t.pnl !== null ? String(t.pnl) : null,
      pnlPercent: pnlPct !== null ? String(pnlPct) : null,
      fees: String(totalCost * 0.001),
      stopLoss: String(t.entry * 0.98),
      takeProfit: String(t.entry * 1.04),
      mode: "paper",
      openedAt,
      closedAt,
    }).onConflictDoNothing();
  }

  const logEntries = [
    { level: "info" as const, message: "Bot initialized in paper trading mode", source: "bot" },
    { level: "info" as const, message: "Connected to Binance (testnet)", source: "exchange-manager" },
    { level: "info" as const, message: "Strategy 'BTC Scalper' activated", source: "strategy-manager" },
    { level: "info" as const, message: "Trade opened: buy BTC/USDT @ 62450", source: "trading-engine" },
    { level: "info" as const, message: "Trade closed: BTC/USDT PnL: +68.50 USDT", source: "trading-engine" },
    { level: "warn" as const, message: "Rate limit approaching on Binance API", source: "exchange-manager" },
    { level: "info" as const, message: "WebSocket feed reconnected", source: "ws-manager" },
    { level: "error" as const, message: "Failed to fetch SOL/USDT orderbook, retrying...", source: "market-data" },
    { level: "info" as const, message: "Retry successful, order book synchronized", source: "market-data" },
    { level: "info" as const, message: "Daily PnL summary: +$245.50", source: "bot" },
  ];

  for (const l of logEntries) {
    await db.insert(logsTable).values({ id: generateId(), ...l }).onConflictDoNothing();
  }

  logger.info("Seed complete");
}
