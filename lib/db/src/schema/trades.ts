import { pgTable, text, numeric, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell"]);
export const tradeOrderTypeEnum = pgEnum("trade_order_type", ["market", "limit", "stop_loss", "take_profit", "trailing_stop", "oco", "grid"]);
export const tradeStatusEnum = pgEnum("trade_status", ["open", "closed", "cancelled", "pending"]);
export const tradeModeEnum = pgEnum("trade_mode", ["live", "paper"]);

export const tradesTable = pgTable("trades", {
  id: text("id").primaryKey(),
  exchangeId: text("exchange_id").notNull(),
  exchangeName: text("exchange_name").notNull(),
  symbol: text("symbol").notNull(),
  side: tradeSideEnum("side").notNull(),
  orderType: tradeOrderTypeEnum("order_type").notNull().default("market"),
  status: tradeStatusEnum("status").notNull().default("open"),
  strategyId: text("strategy_id"),
  strategyName: text("strategy_name"),
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  totalCost: numeric("total_cost", { precision: 20, scale: 8 }).notNull(),
  pnl: numeric("pnl", { precision: 20, scale: 8 }),
  pnlPercent: numeric("pnl_percent", { precision: 10, scale: 4 }),
  fees: numeric("fees", { precision: 20, scale: 8 }).notNull().default("0"),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 20, scale: 8 }),
  trailingStop: numeric("trailing_stop", { precision: 10, scale: 4 }),
  mode: tradeModeEnum("mode").notNull().default("paper"),
  externalOrderId: text("external_order_id"),
  notes: text("notes"),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ openedAt: true, closedAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
