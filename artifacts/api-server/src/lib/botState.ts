import { logger } from "./logger";
import { db } from "@workspace/db";
import { logsTable } from "@workspace/db";
import { generateId } from "./id";

export type BotState = "running" | "stopped" | "paused" | "error";
export type BotMode = "live" | "paper";

interface BotRuntime {
  state: BotState;
  mode: BotMode;
  startedAt: string | null;
  uptime: number;
  activeStrategies: number;
  openTrades: number;
  totalTradesToday: number;
  lastError: string | null;
  version: string;
}

const bot: BotRuntime = {
  state: "stopped",
  mode: "paper",
  startedAt: null,
  uptime: 0,
  activeStrategies: 0,
  openTrades: 0,
  totalTradesToday: 0,
  lastError: null,
  version: "1.0.0",
};

let uptimeInterval: ReturnType<typeof setInterval> | null = null;

export function getBotStatus(): BotRuntime {
  if (bot.state === "running" && bot.startedAt) {
    bot.uptime = Math.floor((Date.now() - new Date(bot.startedAt).getTime()) / 1000);
  }
  return { ...bot };
}

export async function logEvent(level: "debug" | "info" | "warn" | "error", message: string, source = "bot", metadata?: Record<string, unknown>) {
  try {
    await db.insert(logsTable).values({
      id: generateId(),
      level,
      message,
      source,
      metadata: metadata ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to persist log event");
  }
}

export async function startBot(mode: BotMode = "paper"): Promise<BotRuntime> {
  if (bot.state === "running") return getBotStatus();
  bot.state = "running";
  bot.mode = mode;
  bot.startedAt = new Date().toISOString();
  bot.lastError = null;
  bot.uptime = 0;

  if (uptimeInterval) clearInterval(uptimeInterval);
  uptimeInterval = setInterval(() => {
    if (bot.state === "running" && bot.startedAt) {
      bot.uptime = Math.floor((Date.now() - new Date(bot.startedAt).getTime()) / 1000);
    }
  }, 1000);

  await logEvent("info", `Bot started in ${mode} mode`, "bot");
  logger.info({ mode }, "Bot started");
  return getBotStatus();
}

export async function stopBot(): Promise<BotRuntime> {
  if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
  bot.state = "stopped";
  bot.startedAt = null;
  bot.uptime = 0;
  await logEvent("info", "Bot stopped", "bot");
  return getBotStatus();
}

export async function pauseBot(): Promise<BotRuntime> {
  if (bot.state === "running") {
    bot.state = "paused";
    await logEvent("info", "Bot paused", "bot");
  }
  return getBotStatus();
}

export async function resumeBot(): Promise<BotRuntime> {
  if (bot.state === "paused") {
    bot.state = "running";
    await logEvent("info", "Bot resumed", "bot");
  }
  return getBotStatus();
}

export function updateOpenTrades(count: number) {
  bot.openTrades = count;
}

export function updateActiveStrategies(count: number) {
  bot.activeStrategies = count;
}

export function incrementTradesToday() {
  bot.totalTradesToday++;
}
