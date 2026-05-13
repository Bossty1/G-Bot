import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SINGLETON_ID = "singleton";

const defaultSettings = {
  id: SINGLETON_ID,
  defaultMode: "paper" as const,
  globalRisk: {
    maxPositionSize: 100,
    maxOpenTrades: 5,
    dailyLossLimit: 500,
    tradeСooldownSeconds: 60,
    stopLossPercent: 2,
    takeProfitPercent: 4,
    trailingStopPercent: null,
  },
  notifications: {
    telegramEnabled: false,
    telegramChatId: null,
    discordEnabled: false,
    discordWebhookUrl: null,
    notifyOnOpen: true,
    notifyOnClose: true,
    notifyOnError: true,
    notifyOnProfit: true,
  },
  websocketEnabled: true,
  websocketReconnectIntervalMs: "5000",
};

async function getOrCreate() {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, SINGLETON_ID));
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values(defaultSettings).returning();
  return created!;
}

function formatSettings(s: Record<string, unknown>) {
  return {
    defaultMode: s["defaultMode"],
    globalRisk: s["globalRisk"],
    notifications: s["notifications"],
    websocket: {
      enabled: s["websocketEnabled"],
      reconnectIntervalMs: parseInt(String(s["websocketReconnectIntervalMs"] ?? "5000")),
    },
    updatedAt: s["updatedAt"] instanceof Date ? (s["updatedAt"] as Date).toISOString() : String(s["updatedAt"] ?? ""),
  };
}

router.get("/", async (_req, res) => {
  const settings = await getOrCreate();
  res.json(formatSettings(settings as Record<string, unknown>));
});

router.put("/", async (req, res) => {
  const body = req.body;
  await getOrCreate();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.defaultMode) updateData["defaultMode"] = body.defaultMode;
  if (body.globalRisk) updateData["globalRisk"] = body.globalRisk;
  if (body.notifications) updateData["notifications"] = body.notifications;

  const [updated] = await db
    .update(settingsTable)
    .set(updateData)
    .where(eq(settingsTable.id, SINGLETON_ID))
    .returning();

  res.json(formatSettings(updated as Record<string, unknown>));
});

export default router;
