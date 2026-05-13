import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chainEnum = pgEnum("chain", ["ethereum", "bsc", "solana", "bitcoin", "polygon"]);

export const walletsTable = pgTable("wallets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  chain: chainEnum("chain").notNull(),
  address: text("address").notNull(),
  encryptedPrivateKey: text("encrypted_private_key"),
  encryptedMnemonic: text("encrypted_mnemonic"),
  isImported: boolean("is_imported").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ createdAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
