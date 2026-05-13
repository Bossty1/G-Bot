import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import tradesRouter from "./trades";
import walletsRouter from "./wallets";
import strategiesRouter from "./strategies";
import exchangesRouter from "./exchanges";
import dashboardRouter from "./dashboard";
import logsRouter from "./logs";
import settingsRouter from "./settings";
import backtestsRouter from "./backtests";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bot", botRouter);
router.use("/trades", tradesRouter);
router.use("/wallets", walletsRouter);
router.use("/strategies", strategiesRouter);
router.use("/exchanges", exchangesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/logs", logsRouter);
router.use("/settings", settingsRouter);
router.use("/backtests", backtestsRouter);

export default router;
