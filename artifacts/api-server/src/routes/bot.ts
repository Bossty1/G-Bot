import { Router } from "express";
import { getBotStatus, startBot, stopBot, pauseBot, resumeBot } from "../lib/botState";

const router = Router();

router.get("/status", async (_req, res) => {
  res.json(getBotStatus());
});

router.post("/start", async (req, res) => {
  const mode = req.body?.mode === "live" ? "live" : "paper";
  const status = await startBot(mode);
  res.json(status);
});

router.post("/stop", async (_req, res) => {
  const status = await stopBot();
  res.json(status);
});

router.post("/pause", async (_req, res) => {
  const status = await pauseBot();
  res.json(status);
});

router.post("/resume", async (_req, res) => {
  const status = await resumeBot();
  res.json(status);
});

export default router;
