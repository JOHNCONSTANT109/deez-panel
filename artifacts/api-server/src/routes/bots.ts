import { Router, type IRouter } from "express";
import { Bot, BotLog, isValidObjectId } from "@workspace/db";
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
import type { IBot } from "@workspace/db";
import type { IBotLog } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string | string[]): string {
  const str = Array.isArray(raw) ? raw[0] : raw;
  return isValidObjectId(str) ? str : "";
}

function botToResponse(bot: IBot) {
  const obj = bot.toObject();
  return {
    id: (obj._id as { toString(): string }).toString(),
    name: obj.name,
    type: obj.type,
    hasToken: obj.token != null && obj.token.length > 0,
    status: obj.status,
    prefix: obj.prefix,
    description: obj.description ?? null,
    avatarUrl: obj.avatarUrl ?? null,
    serverCount: obj.serverCount ?? null,
    userCount: obj.userCount ?? null,
    uptimeSeconds: obj.uptimeSeconds ?? null,
    entryFile: obj.entryFile ?? null,
    repoUrl: obj.repoUrl ?? null,
    createdAt: obj.createdAt.toISOString(),
    updatedAt: obj.updatedAt.toISOString(),
  };
}

function logToResponse(log: IBotLog) {
  const obj = log.toObject();
  return {
    id: (obj._id as { toString(): string }).toString(),
    botId: obj.botId.toString(),
    level: obj.level,
    message: obj.message,
    createdAt: obj.createdAt.toISOString(),
  };
}

// GET /bots/summary — must be before /bots/:id
router.get("/bots/summary", async (_req, res): Promise<void> => {
  const [total, online, offline, error, totalLogs] = await Promise.all([
    Bot.countDocuments(),
    Bot.countDocuments({ status: "online" }),
    Bot.countDocuments({ status: "offline" }),
    Bot.countDocuments({ status: "error" }),
    BotLog.countDocuments(),
  ]);
  res.json(GetBotsSummaryResponse.parse({ total, online, offline, error, totalLogs }));
});

// GET /bots
router.get("/bots", async (_req, res): Promise<void> => {
  const bots = await Bot.find().sort({ createdAt: -1 });
  res.json(ListBotsResponse.parse(bots.map(botToResponse)));
});

// POST /bots
router.post("/bots", async (req, res): Promise<void> => {
  const parsed = CreateBotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const bot = await Bot.create({
    name: parsed.data.name,
    type: parsed.data.type,
    token: parsed.data.token ?? null,
    prefix: parsed.data.prefix,
    description: parsed.data.description ?? null,
    avatarUrl: parsed.data.avatarUrl ?? null,
    status: "offline",
  });

  await BotLog.create({ botId: bot._id, level: "info", message: `Bot "${bot.name}" created and registered.` });
  res.status(201).json(CreateBotResponse.parse(botToResponse(bot)));
});

// GET /bots/:id
router.get("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = GetBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bot = await Bot.findById(id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  res.json(GetBotResponse.parse(botToResponse(bot)));
});

// PATCH /bots/:id
router.patch("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = UpdateBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const bot = await Bot.findByIdAndUpdate(
    params.data.id,
    { ...parsed.data, updatedAt: new Date() },
    { new: true },
  );
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  res.json(UpdateBotResponse.parse(botToResponse(bot)));
});

// DELETE /bots/:id
router.delete("/bots/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = DeleteBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  stopProcess(id);
  await BotLog.deleteMany({ botId: id });

  const bot = await Bot.findByIdAndDelete(params.data.id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  res.sendStatus(204);
});

// POST /bots/:id/start
router.post("/bots/:id/start", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = StartBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await Bot.findById(params.data.id);
  if (!existing) { res.status(404).json({ error: "Bot not found" }); return; }

  const result = await startProcess(id, existing.entryFile ?? "");

  const newStatus = result.ok ? "online" : "error";
  const bot = await Bot.findByIdAndUpdate(
    params.data.id,
    { status: newStatus, uptimeSeconds: result.ok ? 0 : existing.uptimeSeconds, updatedAt: new Date() },
    { new: true },
  );

  await BotLog.create({
    botId: id,
    level: result.ok ? "info" : "warn",
    message: result.message,
  });

  res.json(StartBotResponse.parse(botToResponse(bot!)));
});

// POST /bots/:id/stop
router.post("/bots/:id/stop", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = StopBotParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await Bot.findById(params.data.id);
  if (!existing) { res.status(404).json({ error: "Bot not found" }); return; }

  stopProcess(id);

  const bot = await Bot.findByIdAndUpdate(
    params.data.id,
    { status: "offline", updatedAt: new Date() },
    { new: true },
  );

  await BotLog.create({ botId: id, level: "warn", message: `Bot "${existing.name}" stopped.` });
  res.json(StopBotResponse.parse(botToResponse(bot!)));
});

// GET /bots/:id/logs
router.get("/bots/:id/logs", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = GetBotLogsParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bot = await Bot.findById(params.data.id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const logs = await BotLog.find({ botId: params.data.id })
    .sort({ createdAt: 1 })
    .limit(200);

  res.json(GetBotLogsResponse.parse(logs.map(logToResponse)));
});

// POST /bots/:id/logs
router.post("/bots/:id/logs", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = AddBotLogParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = AddBotLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const log = await BotLog.create({
    botId: params.data.id,
    level: parsed.data.level,
    message: parsed.data.message,
  });

  res.status(201).json(AddBotLogResponse.parse(logToResponse(log)));
});

// GET /bots/:id/stats
router.get("/bots/:id/stats", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = GetBotStatsParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bot = await Bot.findById(params.data.id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [logsTotal, errorsToday] = await Promise.all([
    BotLog.countDocuments({ botId: id }),
    BotLog.countDocuments({ botId: id, level: "error", createdAt: { $gte: startOfDay } }),
  ]);

  res.json(GetBotStatsResponse.parse({
    botId: id,
    uptimeSeconds: bot.uptimeSeconds ?? 0,
    commandsRun: bot.userCount ?? 0,
    errorsToday,
    logsTotal,
  }));
});

export default router;
