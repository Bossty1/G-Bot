import { Router } from "express";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateWallet, importWallet, type Chain } from "../lib/wallet";
import { encrypt } from "../lib/encryption";
import { logEvent } from "../lib/botState";

const router = Router();

router.get("/", async (_req, res) => {
  const wallets = await db.select().from(walletsTable);
  res.json({ wallets: wallets.map(safeWallet), total: wallets.length });
});

router.post("/", async (req, res) => {
  const { label, chain } = req.body as { label: string; chain: Chain };
  if (!label || !chain) {
    res.status(400).json({ error: "label and chain are required" });
    return;
  }
  const generated = await generateWallet(chain);
  const [wallet] = await db
    .insert(walletsTable)
    .values({ id: generated.id, label, chain, address: generated.address, encryptedPrivateKey: generated.encryptedPrivateKey, encryptedMnemonic: generated.encryptedMnemonic, isImported: false })
    .returning();
  await logEvent("info", `Wallet created: ${label} (${chain})`, "wallet-manager", { address: generated.address });
  res.status(201).json(safeWallet(wallet!));
});

router.post("/import", async (req, res) => {
  const { label, chain, privateKey, mnemonic } = req.body as { label: string; chain: Chain; privateKey?: string; mnemonic?: string };
  if (!label || !chain) {
    res.status(400).json({ error: "label and chain are required" });
    return;
  }
  const imported = await importWallet(chain, privateKey, mnemonic);
  const [wallet] = await db
    .insert(walletsTable)
    .values({ id: imported.id, label, chain, address: imported.address, encryptedPrivateKey: imported.encryptedPrivateKey, encryptedMnemonic: imported.encryptedMnemonic, isImported: true })
    .returning();
  await logEvent("info", `Wallet imported: ${label} (${chain})`, "wallet-manager", { address: imported.address });
  res.status(201).json(safeWallet(wallet!));
});

router.get("/:walletId", async (req, res) => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, req.params.walletId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  res.json(safeWallet(wallet));
});

router.delete("/:walletId", async (req, res) => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, req.params.walletId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  await db.delete(walletsTable).where(eq(walletsTable.id, req.params.walletId!));
  res.status(204).end();
});

router.get("/:walletId/export", async (req, res) => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, req.params.walletId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  res.json({ walletId: wallet.id, chain: wallet.chain, address: wallet.address, encryptedData: wallet.encryptedPrivateKey ?? "", exportedAt: new Date().toISOString() });
});

router.get("/:walletId/balance", async (req, res) => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, req.params.walletId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  const balances = await fetchMockBalance(wallet.chain);
  res.json({ walletId: wallet.id, address: wallet.address, chain: wallet.chain, balances, totalUsdValue: balances.reduce((s, b) => s + (b.usdValue ?? 0), 0), fetchedAt: new Date().toISOString() });
});

function safeWallet(w: Record<string, unknown>) {
  const { encryptedPrivateKey: _k, encryptedMnemonic: _m, ...safe } = w;
  return { ...safe, balances: null, createdAt: w["createdAt"] instanceof Date ? (w["createdAt"] as Date).toISOString() : String(w["createdAt"] ?? "") };
}

async function fetchMockBalance(chain: string) {
  const nativeTokens: Record<string, { token: string; symbol: string }> = {
    ethereum: { token: "Ethereum", symbol: "ETH" },
    bsc: { token: "BNB", symbol: "BNB" },
    solana: { token: "Solana", symbol: "SOL" },
    bitcoin: { token: "Bitcoin", symbol: "BTC" },
    polygon: { token: "Polygon", symbol: "MATIC" },
  };
  const native = nativeTokens[chain] ?? { token: "Unknown", symbol: "???" };
  const balance = (Math.random() * 5).toFixed(6);
  const usdPrices: Record<string, number> = { ETH: 3200, BNB: 600, SOL: 180, BTC: 65000, MATIC: 0.8 };
  const price = usdPrices[native.symbol] ?? 1;
  return [{ token: native.token, symbol: native.symbol, balance, usdValue: parseFloat(balance) * price }];
}

export default router;
