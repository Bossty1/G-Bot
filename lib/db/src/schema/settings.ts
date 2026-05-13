import { pgTable, text, timestamp, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botModeEnum = pgEnum("bot_mode", ["live", "paper"]);

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("singleton"),
  defaultMode: botModeEnum("default_mode").notNull().default("paper"),
  globalRisk: jsonb("global_risk").$type<Record<string, unknown>>().notNull().default({}),
  notifications: jsonb("notifications").$type<Record<string, unknown>>().notNull().default({}),
  websocketEnabled: boolean("websocket_enabled").notNull().default(true),
  websocketReconnectIntervalMs: text("websocket_reconnect_interval_ms").notNull().default("5000"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable);
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
