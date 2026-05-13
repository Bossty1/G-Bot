import { pgTable, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exchangeStatusEnum = pgEnum("exchange_status", ["connected", "disconnected", "error", "testing"]);

export const exchangesTable = pgTable("exchanges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  exchangeId: text("exchange_id").notNull(),
  label: text("label").notNull(),
  status: exchangeStatusEnum("status").notNull().default("disconnected"),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptedApiSecret: text("encrypted_api_secret").notNull(),
  encryptedPassphrase: text("encrypted_passphrase"),
  isTestnet: boolean("is_testnet").notNull().default(false),
  paperTrading: boolean("paper_trading").notNull().default(true),
  rateLimit: integer("rate_limit").notNull().default(1200),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastConnected: timestamp("last_connected"),
});

export const insertExchangeSchema = createInsertSchema(exchangesTable).omit({ createdAt: true, lastConnected: true });
export type InsertExchange = z.infer<typeof insertExchangeSchema>;
export type Exchange = typeof exchangesTable.$inferSelect;
