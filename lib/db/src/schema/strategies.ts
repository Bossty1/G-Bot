import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const strategyTypeEnum = pgEnum("strategy_type", [
  "scalping", "momentum", "arbitrage", "grid", "sniping",
  "ai_signal", "manual", "macd_cross", "rsi_reversal", "bb_squeeze"
]);
export const strategyStatusEnum = pgEnum("strategy_status", ["active", "inactive", "error"]);

export const strategiesTable = pgTable("strategies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  type: strategyTypeEnum("type").notNull(),
  status: strategyStatusEnum("status").notNull().default("inactive"),
  exchangeId: text("exchange_id"),
  symbols: jsonb("symbols").$type<string[]>().notNull().default([]),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  riskConfig: jsonb("risk_config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStrategySchema = createInsertSchema(strategiesTable).omit({ createdAt: true, updatedAt: true });
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategiesTable.$inferSelect;
