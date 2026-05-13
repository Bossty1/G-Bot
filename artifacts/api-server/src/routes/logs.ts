import { Router } from "express";
import { db, logsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const { level, limit = "100", offset = "0", source } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit), 500);
  const off = parseInt(offset);

  const conditions = [];
  if (level && level !== "all") conditions.push(eq(logsTable.level, level as "debug" | "info" | "warn" | "error"));
  if (source) conditions.push(eq(logsTable.source, source));

  let query = db.select().from(logsTable).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));

  const logs = await query.orderBy(desc(logsTable.timestamp)).limit(lim).offset(off);
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(logsTable);

  res.json({
    logs: logs.map((l) => ({
      ...l,
      timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : String(l.timestamp),
    })),
    total: Number(total?.count ?? 0),
    limit: lim,
    offset: off,
  });
});

export default router;
