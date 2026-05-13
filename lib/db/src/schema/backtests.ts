import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backtestStatusEnum = pgEnum("backtest_status", ["pending", "running", "completed", "failed"]);

export const backtestsTable = pgTable("backtests", {
  id: text("id").primaryKey(),
  strategyType: text("strategy_type").notNull(),
  symbol: text("symbol").notNull(),
  exchange: text("exchange").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: backtestStatusEnum("status").notNull().default("pending"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  results: jsonb("results").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertBacktestSchema = createInsertSchema(backtestsTable).omit({ createdAt: true, completedAt: true });
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type Backtest = typeof backtestsTable.$inferSelect;
