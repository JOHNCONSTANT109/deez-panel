import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Terminal, Key, Upload, Github, CheckCircle2, Play, Code } from "lucide-react"

export default function DeployGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deployment Guide</h1>
        <p className="text-muted-foreground mt-2">How to get your bot running on DEEZ PANEL in 3 steps.</p>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <Card className="bg-card/40 border-l-4 border-l-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Key className="w-32 h-32" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">1</span>
              Get Your Bot Token (if needed)
            </CardTitle>
            <CardDescription>Tokens are optional — you can hardcode them in your bot's code file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-primary text-sm">Discord</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-primary hover:underline">discord.com/developers</a></li>
                <li>Create New Application → Bot → Reset Token → copy it</li>
                <li>Invite the bot to your server via OAuth2 URL Generator</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-primary text-sm">Telegram</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Message <strong>@BotFather</strong> on Telegram</li>
                <li>Send <code className="bg-secondary px-1 rounded text-primary">/newbot</code> → follow prompts → copy the API token</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="bg-card/40 border-l-4 border-l-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Upload className="w-32 h-32" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">2</span>
              Upload Your Bot Code
            </CardTitle>
            <CardDescription>Works from your phone, tablet, or desktop — no git required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Option A — Upload Files Directly</h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Open your bot → Files tab → tap "Upload Bot Files"</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Select .js .py .ts files from your phone's file picker</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />The panel auto-detects index.js / main.py as the entry point</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Github className="w-4 h-4 text-primary" /> Option B — Pull from GitHub</h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Files tab → paste your GitHub repo URL (public or private)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />For private repos: add a GitHub personal access token</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Panel downloads all files automatically — no git needed</li>
              </ul>
            </div>

            {/* Example bot */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Code className="w-4 h-4 text-primary" /> Minimal Discord Bot Example (index.js)</h3>
              <div className="rounded-md bg-[#0a0f18] p-4 font-mono text-xs border border-border overflow-x-auto">
                <pre className="text-slate-300">{`const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log(\`Logged in as \${client.user.tag}\`);
});

client.on('messageCreate', msg => {
  if (msg.content === '!ping') msg.reply('Pong!');
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_TOKEN_HERE');`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="bg-card/40 border-l-4 border-l-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Play className="w-32 h-32" /></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">3</span>
              Set Entry Point &amp; Start
            </CardTitle>
            <CardDescription>DEEZ PANEL spawns the actual process and streams output to the log viewer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Auto-detected entry points: <code className="bg-secondary px-1 rounded text-primary text-xs">index.js main.js bot.js index.py main.py</code></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Or manually click "Set as Entry" on any file in the Files tab</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Click <strong>Start</strong> on the dashboard — the panel runs <code className="bg-secondary px-1 rounded text-primary text-xs">node index.js</code> or <code className="bg-secondary px-1 rounded text-primary text-xs">python3 bot.py</code> automatically</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />stdout/stderr stream live to the log viewer — errors highlighted in red</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Click <strong>Stop</strong> to gracefully terminate the process (SIGTERM → SIGKILL)</li>
            </ul>

            <div className="rounded-md bg-[#0a0f18] p-4 font-mono text-xs border border-border">
              <div className="text-muted-foreground mb-2"># Supported runtimes (auto-detected from file extension)</div>
              <pre className="text-slate-300">{`.js  .mjs  .cjs  →  node filename.js
.ts             →  npx ts-node filename.ts
.py             →  python3 filename.py`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Pro tip */}
        <Card className="bg-card/40 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Pro tip: Keep your token in your code, not the panel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use <code className="bg-secondary px-1 rounded text-primary text-xs">process.env.DISCORD_TOKEN</code> in your bot and set it via an <code className="bg-secondary px-1 rounded text-primary text-xs">.env</code> file you upload to the Files tab.
                  DEEZ PANEL never exposes token values through the API.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
