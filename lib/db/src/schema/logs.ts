import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logLevelEnum = pgEnum("log_level", ["debug", "info", "warn", "error"]);

export const logsTable = pgTable("logs", {
  id: text("id").primaryKey(),
  level: logLevelEnum("level").notNull().default("info"),
  message: text("message").notNull(),
  source: text("source").notNull().default("system"),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertLogSchema = createInsertSchema(logsTable).omit({ timestamp: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logsTable.$inferSelect;
