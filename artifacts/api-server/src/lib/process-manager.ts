import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { db, botLogsTable, botsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/** Map of botId → running ChildProcess */
const runningProcesses = new Map<number, ChildProcess>();

const BOT_FILES_DIR = process.env.BOT_FILES_DIR
  ? path.resolve(process.env.BOT_FILES_DIR)
  : path.resolve("/home/runner/workspace/bot-files");

export function getBotDir(botId: number): string {
  return path.join(BOT_FILES_DIR, String(botId));
}

/** Auto-detect the entry file if none is set */
function detectEntryFile(dir: string): string | null {
  const candidates = [
    "index.js", "main.js", "bot.js", "app.js",
    "index.mjs", "main.mjs",
    "index.ts", "main.ts", "bot.ts",
    "index.py", "main.py", "bot.py", "app.py",
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(dir, c))) return c;
  }
  return null;
}

function getRuntimeArgs(filename: string): [string, string[]] {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".py") return ["python3", [filename]];
  if (ext === ".ts") return ["npx", ["ts-node", filename]];
  return ["node", [filename]];
}

async function writeLog(botId: number, level: string, message: string) {
  try {
    await db.insert(botLogsTable).values({ botId, level, message });
  } catch {
    // best-effort
  }
}

export function isRunning(botId: number): boolean {
  return runningProcesses.has(botId);
}

export async function startProcess(botId: number, entryFile: string): Promise<{ ok: boolean; message: string }> {
  if (runningProcesses.has(botId)) {
    return { ok: false, message: "Bot process is already running." };
  }

  const dir = getBotDir(botId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const resolvedEntry = entryFile || detectEntryFile(dir) || "";
  if (!resolvedEntry) {
    return { ok: false, message: "No entry file found. Upload bot files or set an entry point first." };
  }

  const fullPath = path.join(dir, resolvedEntry);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, message: `Entry file "${resolvedEntry}" not found in bot directory.` };
  }

  const [cmd, args] = getRuntimeArgs(resolvedEntry);
  logger.info({ botId, cmd, args, dir }, "Spawning bot process");

  const proc = spawn(cmd, args, { cwd: dir, env: { ...process.env }, stdio: "pipe" });
  runningProcesses.set(botId, proc);

  await writeLog(botId, "info", `Starting process: ${cmd} ${args.join(" ")}`);

  proc.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      writeLog(botId, "info", line);
    }
  });

  proc.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      writeLog(botId, "error", line);
    }
  });

  proc.on("exit", async (code, signal) => {
    runningProcesses.delete(botId);
    const msg = signal
      ? `Process terminated by signal ${signal}`
      : `Process exited with code ${code ?? "unknown"}`;
    await writeLog(botId, code === 0 ? "info" : "warn", msg);
    try {
      await db
        .update(botsTable)
        .set({ status: code === 0 ? "offline" : "error", updatedAt: new Date() })
        .where(eq(botsTable.id, botId));
    } catch {}
  });

  proc.on("error", async (err) => {
    runningProcesses.delete(botId);
    await writeLog(botId, "error", `Failed to start process: ${err.message}`);
    try {
      await db
        .update(botsTable)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(botsTable.id, botId));
    } catch {}
  });

  return { ok: true, message: `Process started: ${cmd} ${args.join(" ")}` };
}

export function stopProcess(botId: number): { ok: boolean; message: string } {
  const proc = runningProcesses.get(botId);
  if (!proc) {
    return { ok: false, message: "No running process found for this bot." };
  }

  proc.kill("SIGTERM");
  setTimeout(() => {
    if (runningProcesses.has(botId)) {
      proc.kill("SIGKILL");
    }
  }, 5000);

  runningProcesses.delete(botId);
  return { ok: true, message: "Process stopped." };
}
