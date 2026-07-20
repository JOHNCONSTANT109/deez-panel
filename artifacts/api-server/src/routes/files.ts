import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import https from "https";
import { Bot, BotLog, isValidObjectId } from "@workspace/db";
import {
  ListBotFilesParams,
  ListBotFilesResponse,
  DeleteBotFileParams,
  PullFromGithubParams,
  PullFromGithubBody,
  PullFromGithubResponse,
} from "@workspace/api-zod";
import { getBotDir } from "../lib/process-manager";

const router: IRouter = Router();

function parseId(raw: string | string[]): string {
  const str = Array.isArray(raw) ? raw[0] : raw;
  return isValidObjectId(str) ? str : "";
}

function ensureBotDir(botId: string): string {
  const dir = getBotDir(botId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, "_");
}

/** List files in a bot's directory */
router.get("/bots/:id/files", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = ListBotFilesParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bot = await Bot.findById(id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const dir = getBotDir(id);
  if (!fs.existsSync(dir)) {
    res.json(ListBotFilesResponse.parse([]));
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const stat = fs.statSync(path.join(dir, e.name));
      return {
        name: e.name,
        sizeBytes: stat.size,
        isEntryPoint: bot.entryFile === e.name,
        updatedAt: stat.mtime.toISOString(),
      };
    });

  res.json(ListBotFilesResponse.parse(entries));
});

/** Upload files (multipart) */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const id = parseId(req.params.id);
    if (!id) { cb(new Error("Invalid id"), ""); return; }
    const dir = ensureBotDir(id);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

router.post(
  "/bots/:id/files/upload",
  upload.array("files", 20),
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

    const bot = await Bot.findById(id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    for (const f of files) {
      await BotLog.create({
        botId: id,
        level: "info",
        message: `File uploaded: ${f.originalname} (${(f.size / 1024).toFixed(1)} KB)`,
      });
    }

    // Auto-set entry file if none is configured
    if (!bot.entryFile) {
      const candidates = ["index.js", "main.js", "bot.js", "app.js", "index.py", "main.py", "bot.py", "index.ts"];
      const firstMatch = files.find((f) => candidates.includes(f.filename));
      if (firstMatch) {
        await Bot.findByIdAndUpdate(id, { entryFile: firstMatch.filename, updatedAt: new Date() });
      }
    }

    res.json({ uploaded: files.map((f) => ({ name: f.filename, size: f.size })) });
  },
);

/** Delete a file */
router.delete("/bots/:id/files/:filename", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filename = sanitizeFilename(decodeURIComponent(raw));

  const params = DeleteBotFileParams.safeParse({ id, filename });
  if (!params.success) { res.status(400).json({ error: "Invalid params" }); return; }

  const bot = await Bot.findById(id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const dir = getBotDir(id);
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }

  fs.unlinkSync(filePath);

  if (bot.entryFile === filename) {
    await Bot.findByIdAndUpdate(id, { entryFile: null, updatedAt: new Date() });
  }

  await BotLog.create({ botId: id, level: "warn", message: `File deleted: ${filename}` });

  res.sendStatus(204);
});

/** Pull files from a GitHub repository */
router.post("/bots/:id/github", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const params = PullFromGithubParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = PullFromGithubBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const bot = await Bot.findById(id);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const { repoUrl, accessToken } = parsed.data;

  const match = repoUrl.match(/(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  if (!match) {
    res.status(400).json({ error: "Invalid GitHub repo URL. Expected: https://github.com/owner/repo" });
    return;
  }

  const [, owner, repo] = match;
  const dir = ensureBotDir(id);

  await BotLog.create({ botId: id, level: "info", message: `Pulling from GitHub: ${owner}/${repo}` });

  try {
    const apiBase = "https://api.github.com";
    const headers: Record<string, string> = {
      "User-Agent": "DEEZ-PANEL",
      Accept: "application/vnd.github+json",
    };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const repoInfo = await githubGet(`${apiBase}/repos/${owner}/${repo}`, headers);
    const defaultBranch = (repoInfo as { default_branch?: string }).default_branch ?? "main";

    const treeResp = await githubGet(
      `${apiBase}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      headers,
    ) as { tree?: { type: string; path: string }[] };

    const files = (treeResp.tree ?? []).filter(
      (item) => item.type === "blob" && !item.path.includes("node_modules") && !item.path.startsWith("."),
    );

    let downloaded = 0;
    for (const item of files) {
      const raw = await githubGetRaw(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`,
        headers,
      );
      const dest = path.join(dir, sanitizeFilename(path.basename(item.path)));
      fs.writeFileSync(dest, raw);
      downloaded++;
    }

    await Bot.findByIdAndUpdate(id, {
      repoUrl: `https://github.com/${owner}/${repo}`,
      updatedAt: new Date(),
    });

    if (!bot.entryFile) {
      const candidates = ["index.js", "main.js", "bot.js", "app.js", "index.py", "main.py", "bot.py", "index.ts"];
      for (const c of candidates) {
        if (fs.existsSync(path.join(dir, c))) {
          await Bot.findByIdAndUpdate(id, { entryFile: c, updatedAt: new Date() });
          break;
        }
      }
    }

    await BotLog.create({
      botId: id,
      level: "info",
      message: `GitHub pull complete: ${downloaded} file(s) from ${owner}/${repo}`,
    });

    res.json(PullFromGithubResponse.parse({ success: true, message: `Pulled ${downloaded} file(s)`, filesCount: downloaded }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "GitHub pull failed";
    await BotLog.create({ botId: id, level: "error", message: `GitHub pull error: ${msg}` });
    res.status(400).json({ error: msg });
  }
});

function githubGet(url: string, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (resp) => {
      let data = "";
      resp.on("data", (chunk) => { data += chunk; });
      resp.on("end", () => {
        if (resp.statusCode && resp.statusCode >= 400) {
          reject(new Error(`GitHub API error ${resp.statusCode}: ${data}`));
        } else {
          try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON from GitHub API")); }
        }
      });
    });
    req.on("error", reject);
  });
}

function githubGetRaw(url: string, headers: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (resp) => {
      const chunks: Buffer[] = [];
      resp.on("data", (chunk: Buffer) => chunks.push(chunk));
      resp.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
  });
}

export default router;
