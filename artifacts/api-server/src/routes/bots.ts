import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, botsTable, botLogsTable } from "@workspace/db";
import {
  CreateBotBody,
  UpdateBotBody,
  GetBotParams,
  UpdateBotParams,
  DeleteBotParams,
  StartBotParams,
  StopBotParams,
  GetBotLogsParams,
  AddBotLogParams,
  AddBotLogBody,
  GetBotStatsParams,
  ListBotsResponse,
  CreateBotResponse,
  GetBotResponse,
  UpdateBotResponse,
  StartBotResponse,
  StopBotResponse,
  GetBotLogsResponse,
  AddBotLogResponse,
  GetBotsSummaryResponse,
  GetBotStatsResponse,
} from "@workspace/api-zod";
import { startProcess, stopProcess } from "../lib/process-manager";

type BotRow = typeof botsTable.$inferSelect;
type LogRow = typeof botLogsTable.$inferSelect;

function botToResponse(bot: BotRow) {
  const { token, createdAt, updatedAt, ...rest } = bot;
  return {
    ...rest,
    hasToken: token != null && token.length > 0,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function logToResponse(log: LogRow) {
  return { ...log, createdAt: log.createdAt.toISOString() };
}

function parseId(raw: string | string[]): number {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(str);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

const router: IRouter = Router();

// GET /bots/summary — must be before /bots/:id
router.get("/bots/summary", async (req, res): Promise<void> => {
  const bots = await db.select().from(botsTable);
  const total = bots.length;
  const online = bots.filter((b) => b.status === "online").length;
  const offline = bots.filter((b) => b.status === "offline").length;
  const error = bots.filter((b) => b.status === "error").length;
  const [logsCount] = await db.select({ count: count() }).from(botLogsTable);
  res.json(GetBotsSummaryResponse.parse({ total, online, offline, error, totalLogs: logsCount?.count ?? 0 }));
});

// GET /bots
router.get("/bots", async (req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(desc(botsTable.createdAt));
  res.json(ListBotsResponse.parse(bots.map(botToResponse)));
});

// POST /bots
router.post("/bots", async (req, res): Promise<void> => {
  const parsed = CreateBotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [bot] = await db.insert(botsTable).values({
    name: parsed.data.name,
    type: parsed.data.type,
    token: parsed.data.token ?? null,
    prefix: parsed.data.prefix,
    description: parsed.data.description ?? null,
    avatarUrl: parsed.data.avatarUrl ?? null,
    status: "offline",
  }).returning();

  await db.insert(botLogsTable).values({ botId: bot.id, level: "info", message: `Bot "${bot.name}" created and registered.` });
  res.status(201).json(CreateBotResponse.parse(botToResponse(bot)));
});

// GET /bots/:id
router.get("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = GetBotParams.safeParse({ id });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, parsed.data.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  res.json(GetBotResponse.parse(botToResponse(bot)));
});

// PATCH /bots/:id
router.patch("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = UpdateBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [bot] = await db.update(botsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();

  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json(UpdateBotResponse.parse(botToResponse(bot)));
});

// DELETE /bots/:id
router.delete("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = DeleteBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  stopProcess(id);

  const [bot] = await db.delete(botsTable).where(eq(botsTable.id, params.data.id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  res.sendStatus(204);
});

// POST /bots/:id/start
router.post("/bots/:id/start", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = StartBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Bot not found" }); return; }

  // Try to actually spawn the process
  const result = await startProcess(id, existing.entryFile ?? "");

  const newStatus = result.ok ? "online" : "error";
  const [bot] = await db.update(botsTable)
    .set({ status: newStatus, uptimeSeconds: result.ok ? 0 : existing.uptimeSeconds, updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();

  await db.insert(botLogsTable).values({
    botId: id,
    level: result.ok ? "info" : "warn",
    message: result.message,
  });

  res.json(StartBotResponse.parse(botToResponse(bot)));
});

// POST /bots/:id/stop
router.post("/bots/:id/stop", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = StopBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Bot not found" }); return; }

  stopProcess(id);

  const [bot] = await db.update(botsTable)
    .set({ status: "offline", updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();

  await db.insert(botLogsTable).values({ botId: id, level: "warn", message: `Bot "${existing.name}" stopped.` });
  res.json(StopBotResponse.parse(botToResponse(bot)));
});

// GET /bots/:id/logs
router.get("/bots/:id/logs", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = GetBotLogsParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const logs = await db.select().from(botLogsTable)
    .where(eq(botLogsTable.botId, params.data.id))
    .orderBy(desc(botLogsTable.createdAt))
    .limit(200);

  res.json(GetBotLogsResponse.parse(logs.reverse().map(logToResponse)));
});

// POST /bots/:id/logs
router.post("/bots/:id/logs", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = AddBotLogParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = AddBotLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [log] = await db.insert(botLogsTable).values({
    botId: params.data.id,
    level: parsed.data.level,
    message: parsed.data.message,
  }).returning();

  res.status(201).json(AddBotLogResponse.parse(logToResponse(log)));
});

// GET /bots/:id/stats
router.get("/bots/:id/stats", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = GetBotStatsParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const [logsTotal] = await db.select({ count: count() }).from(botLogsTable).where(eq(botLogsTable.botId, params.data.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [errorsToday] = await db.select({ count: count() }).from(botLogsTable).where(
    sql`${botLogsTable.botId} = ${params.data.id} AND ${botLogsTable.level} = 'error' AND ${botLogsTable.createdAt} >= ${today}`
  );

  res.json(GetBotStatsResponse.parse({
    botId: bot.id,
    uptimeSeconds: bot.uptimeSeconds ?? 0,
    commandsRun: bot.userCount ?? 0,
    errorsToday: errorsToday?.count ?? 0,
    logsTotal: logsTotal?.count ?? 0,
  }));
});

export default router;
