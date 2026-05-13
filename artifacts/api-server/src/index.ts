import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { getBotStatus } from "./lib/botState";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { seedInitialData } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

function broadcast(data: unknown) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  logger.info("WebSocket client connected");

  ws.send(JSON.stringify({ type: "connected", data: { message: "CryptoBot WebSocket connected" } }));

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 30000);

  ws.on("close", () => {
    clearInterval(pingInterval);
    logger.info("WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
    clearInterval(pingInterval);
  });
});

setInterval(async () => {
  try {
    const status = getBotStatus();
    const [openTradesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tradesTable)
      .where(eq(tradesTable.status, "open"));
    status.openTrades = Number(openTradesResult?.count ?? 0);
    broadcast({ type: "bot_status", data: status });
  } catch (err) {
    logger.error({ err }, "WS broadcast error");
  }
}, 5000);

httpServer.listen(port, async () => {
  logger.info({ port }, "Server listening");
  try {
    await seedInitialData();
  } catch (err) {
    logger.error({ err }, "Seed error (non-fatal)");
  }
});
