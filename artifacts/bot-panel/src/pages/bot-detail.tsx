import { useEffect, useRef, useState } from "react"
import { useRoute, useLocation, Link } from "wouter"
import {
  useGetBot,
  useGetBotLogs,
  useGetBotStats,
  useStartBot,
  useStopBot,
  useDeleteBot,
  useUpdateBot,
  useListBotFiles,
  useDeleteBotFile,
  usePullFromGithub,
  getGetBotQueryKey,
  getListBotsQueryKey,
  getGetBotsSummaryQueryKey,
  getGetBotLogsQueryKey,
  getListBotFilesQueryKey,
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Terminal, Play, Square, Trash2, ArrowLeft, Activity,
  Server, Clock, RefreshCw, Upload, Github, File,
  Star, X, FolderOpen, CheckCircle, AlertCircle,
} from "lucide-react"

function runtimeLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (["py"].includes(ext)) return "Python"
  if (["ts"].includes(ext)) return "TypeScript (ts-node)"
  if (["mjs", "cjs"].includes(ext)) return "Node.js"
  return "Node.js"
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

function formatUptime(seconds: number): string {
  if (!seconds) return "0s"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}h ${m}m ${s}s`
}

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id")
  const [, setLocation] = useLocation()
  const id = Number(params?.id)
  const queryClient = useQueryClient()

  const { data: bot, isLoading: loadingBot } = useGetBot(id, {
    query: { enabled: !!id, queryKey: getGetBotQueryKey(id), refetchInterval: 5000 }
  })
  const { data: stats } = useGetBotStats(id, {
    query: { enabled: !!id, queryKey: [`/api/bots/${id}/stats`], refetchInterval: 5000 }
  })
  const { data: logs, isLoading: loadingLogs } = useGetBotLogs(id, {
    query: { enabled: !!id, queryKey: getGetBotLogsQueryKey(id), refetchInterval: 2000 }
  })
  const { data: files, isLoading: loadingFiles } = useListBotFiles(id, {
    query: { enabled: !!id, queryKey: getListBotFilesQueryKey(id), refetchInterval: 3000 }
  })

  const startBot = useStartBot()
  const stopBot = useStopBot()
  const deleteBot = useDeleteBot()
  const updateBot = useUpdateBot()
  const deleteFile = useDeleteBotFile()
  const pullGithub = usePullFromGithub()

  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [githubResult, setGithubResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  // Pre-fill repo URL from bot if set
  useEffect(() => {
    if (bot?.repoUrl && !repoUrl) setRepoUrl(bot.repoUrl)
  }, [bot?.repoUrl])

  if (loadingBot && !bot) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading system files...</div>
  }
  if (!bot) {
    return <div className="p-8 text-center text-destructive">Bot not found.</div>
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(id) })
    queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetBotsSummaryQueryKey() })
    queryClient.invalidateQueries({ queryKey: getListBotFilesQueryKey(id) })
  }

  const handleStart = () => startBot.mutate({ id }, { onSuccess: invalidateAll })
  const handleStop = () => stopBot.mutate({ id }, { onSuccess: invalidateAll })
  const handleDelete = () => {
    if (confirm(`Permanently delete "${bot.name}" and all its files?`)) {
      deleteBot.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetBotsSummaryQueryKey() })
          setLocation("/")
        }
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return
    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    Array.from(selected).forEach((f) => formData.append("files", f))
    try {
      const resp = await fetch(`/api/bots/${id}/files/upload`, { method: "POST", body: formData })
      const json = await resp.json()
      if (resp.ok) {
        setUploadResult(`Uploaded ${json.uploaded?.length ?? 0} file(s)`)
        invalidateAll()
      } else {
        setUploadResult(`Error: ${json.error ?? "Upload failed"}`)
      }
    } catch (err: any) {
      setUploadResult(`Error: ${err?.message ?? "Upload failed"}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleGithubPull = () => {
    if (!repoUrl.trim()) return
    setGithubResult(null)
    pullGithub.mutate(
      { id, data: { repoUrl: repoUrl.trim(), ...(accessToken ? { accessToken } : {}) } },
      {
        onSuccess: (result) => {
          setGithubResult({ ok: true, msg: result.message })
          invalidateAll()
        },
        onError: (err: any) => {
          setGithubResult({ ok: false, msg: err?.data?.error ?? err?.message ?? "Pull failed" })
        },
      }
    )
  }

  const handleSetEntry = (filename: string) => {
    updateBot.mutate({ id, data: { entryFile: filename } }, { onSuccess: invalidateAll })
  }

  const handleDeleteFile = (filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return
    deleteFile.mutate({ id, filename }, { onSuccess: invalidateAll })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{bot.name}</h1>
              <Badge variant={bot.status as any} className="uppercase px-2">
                {bot.status === "online" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />}
                {bot.status}
              </Badge>
              {bot.entryFile && (
                <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                  {bot.entryFile} · {runtimeLabel(bot.entryFile)}
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-muted-foreground mt-1 uppercase tracking-wider">
              {bot.type} · PREFIX: {bot.prefix}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bot.status === "offline" || bot.status === "error" ? (
            <Button onClick={handleStart} disabled={startBot.isPending} className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50">
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
          ) : (
            <Button onClick={handleStop} disabled={stopBot.isPending} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
          )}
          <Button variant="outline" onClick={handleDelete} disabled={deleteBot.isPending} className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <Card className="bg-card/40">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground font-mono">SYSTEM_METRICS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Clock, label: "Uptime", value: formatUptime(stats?.uptimeSeconds || bot.uptimeSeconds || 0) },
                    { icon: Terminal, label: "Commands Run", value: String(stats?.commandsRun ?? 0) },
                    { icon: Server, label: "Servers", value: String(bot.serverCount ?? 0) },
                    { icon: Activity, label: "Errors Today", value: String(stats?.errorsToday ?? 0), red: !!(stats?.errorsToday) },
                  ].map(({ icon: Icon, label, value, red }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="w-4 h-4" />{label}</div>
                      <span className={`font-mono font-medium ${red ? "text-red-400" : ""}`}>{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card/40">
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground font-mono">INFO</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{bot.description || "No description provided."}</p>
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="text-xs font-mono text-muted-foreground flex justify-between"><span>ID:</span><span>{bot.id}</span></div>
                    <div className="text-xs font-mono text-muted-foreground flex justify-between"><span>CREATED:</span><span>{new Date(bot.createdAt).toLocaleDateString()}</span></div>
                    {bot.repoUrl && (
                      <div className="text-xs font-mono text-muted-foreground flex justify-between gap-2">
                        <span>REPO:</span>
                        <a href={bot.repoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{bot.repoUrl.replace("https://github.com/", "")}</a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Logs */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col bg-[#0a0f18] border-primary/20">
                <CardHeader className="border-b border-border/50 py-3 bg-card/50 backdrop-blur flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-mono tracking-wider">LIVE_LOGS</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground">
                      <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-primary rounded" />
                      Auto-scroll
                    </label>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <RefreshCw className={`w-3 h-3 ${loadingLogs ? "animate-spin text-primary" : ""}`} />
                      POLLING
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <div className="h-[500px] overflow-y-auto p-4 font-mono text-xs">
                    {!logs || logs.length === 0 ? (
                      <div className="text-muted-foreground/50 text-center mt-20">Waiting for log output...</div>
                    ) : (
                      <div className="space-y-1">
                        {logs.map((log) => (
                          <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded">
                            <span className="text-muted-foreground/50 shrink-0 select-none">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <span className={`shrink-0 font-medium w-12 ${log.level === "info" ? "text-primary" : log.level === "warn" ? "text-yellow-400" : log.level === "error" ? "text-red-400" : "text-slate-500"}`}>
                              [{log.level.toUpperCase()}]
                            </span>
                            <span className="text-slate-300 break-all">{log.message}</span>
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── FILES TAB ── */}
        <TabsContent value="files" className="mt-6 space-y-6">
          {/* Entry point banner */}
          {bot.entryFile ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-mono text-primary font-medium">Entry Point: {bot.entryFile}</span>
              <span className="text-xs text-muted-foreground">· Runtime: {runtimeLabel(bot.entryFile)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-sm text-yellow-300">No entry point set. Upload files and click "Set as Entry" on the file to run.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload */}
            <Card className="bg-card/40 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <Upload className="w-4 h-4 text-primary" /> UPLOAD_FILES
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".js,.mjs,.cjs,.ts,.py,.json,.txt,.env,.sh,.yaml,.yml"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FolderOpen className={`w-10 h-10 ${uploading ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className="font-medium text-sm">{uploading ? "Uploading..." : "Tap to Upload Bot Files"}</p>
                    <p className="text-xs text-muted-foreground mt-1">.js · .py · .ts · .json · .env · .sh</p>
                    <p className="text-xs text-muted-foreground">Works from phone or desktop</p>
                  </div>
                </button>
                {uploadResult && (
                  <p className={`text-sm text-center font-mono ${uploadResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                    {uploadResult}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* GitHub */}
            <Card className="bg-card/40 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <Github className="w-4 h-4 text-primary" /> GITHUB_PULL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">REPO URL</Label>
                  <Input
                    placeholder="https://github.com/user/my-bot"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">ACCESS TOKEN <span className="text-muted-foreground/60">(optional — for private repos)</span></Label>
                  <Input
                    type="password"
                    placeholder="ghp_xxxx"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleGithubPull}
                  disabled={!repoUrl.trim() || pullGithub.isPending}
                  className="w-full"
                  variant="outline"
                >
                  <Github className="w-4 h-4 mr-2" />
                  {pullGithub.isPending ? "Pulling..." : "Pull from GitHub"}
                </Button>
                {githubResult && (
                  <div className={`flex items-start gap-2 text-sm p-2 rounded border ${githubResult.ok ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {githubResult.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span className="font-mono text-xs">{githubResult.msg}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* File List */}
          <Card className="bg-card/40 border-primary/10">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <File className="w-4 h-4 text-primary" /> DEPLOYED_FILES
              </CardTitle>
              {loadingFiles && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {!files || files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No files yet.</p>
                  <p className="text-xs mt-1">Upload files or pull from GitHub above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.name} className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${file.isEntryPoint ? "border-primary/30 bg-primary/5" : "border-border hover:border-border/80 bg-card/20"}`}>
                      <File className={`w-4 h-4 shrink-0 ${file.isEntryPoint ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium truncate">{file.name}</span>
                          {file.isEntryPoint && (
                            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-mono">ENTRY</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {formatBytes(file.sizeBytes)} · {new Date(file.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!file.isEntryPoint && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleSetEntry(file.name)}
                            disabled={updateBot.isPending}
                          >
                            <Star className="w-3 h-3 mr-1" /> Set Entry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeleteFile(file.name)}
                          disabled={deleteFile.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
