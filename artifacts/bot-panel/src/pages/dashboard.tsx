import {
  useListBots,
  useGetBotsSummary,
  useStartBot,
  useStopBot,
  getListBotsQueryKey,
  getGetBotsSummaryQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Square, Activity, Server, Zap, AlertTriangle, Terminal, Plus } from "lucide-react"
import { Link } from "wouter"

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: summary, isLoading: loadingSummary } = useGetBotsSummary()
  const { data: bots, isLoading: loadingBots } = useListBots()

  const startBot = useStartBot()
  const stopBot = useStopBot()

  const handleStart = (id: number) => {
    startBot.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetBotsSummaryQueryKey() })
      }
    })
  }

  const handleStop = (id: number) => {
    stopBot.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetBotsSummaryQueryKey() })
      }
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your automated fleet.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-primary/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-mono">TOTAL_BOTS</p>
                <p className="text-3xl font-bold mt-2" data-testid="text-total-bots">{loadingSummary ? "-" : summary?.total || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Server className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-mono">ONLINE</p>
                <p className="text-3xl font-bold mt-2 text-green-400" data-testid="text-online-bots">{loadingSummary ? "-" : summary?.online || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-slate-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-mono">OFFLINE</p>
                <p className="text-3xl font-bold mt-2 text-slate-400" data-testid="text-offline-bots">{loadingSummary ? "-" : summary?.offline || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-mono">ERRORS</p>
                <p className="text-3xl font-bold mt-2 text-red-400" data-testid="text-error-bots">{loadingSummary ? "-" : summary?.error || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Active Deployments
          </h2>
        </div>

        {loadingBots ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-48 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : !bots || bots.length === 0 ? (
          <Card className="bg-card/20 border-dashed border-2 flex flex-col items-center justify-center p-12 text-center">
            <Terminal className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No bots deployed</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">You haven't added any bots to the panel yet. Create your first deployment to get started.</p>
            <Link href="/bots/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2" data-testid="button-add-first-bot">
              <Plus className="w-4 h-4" />
              Deploy Bot
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot, i) => (
              <Card key={bot.id} className="group hover:border-primary/50 transition-colors bg-card/60 backdrop-blur" style={{ animationDelay: `${i * 50}ms` }}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link href={`/bots/${bot.id}`} className="hover:text-primary transition-colors" data-testid={`link-bot-${bot.id}`}>
                          {bot.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1 uppercase tracking-wider">
                        {bot.type}
                      </CardDescription>
                    </div>
                    <Badge variant={bot.status as any} className="capitalize">
                      {bot.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />}
                      {bot.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {bot.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-4 mt-4 text-xs font-mono text-muted-foreground">
                    <span title="Prefix" className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{bot.prefix}</span>
                    {bot.serverCount != null && <span>SERVERS: {bot.serverCount}</span>}
                  </div>
                </CardContent>
                <div className="px-6 pb-6 pt-0 flex gap-2">
                  <Link href={`/bots/${bot.id}`} className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3" data-testid={`button-manage-${bot.id}`}>
                    Manage
                  </Link>
                  {bot.status === 'offline' || bot.status === 'error' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                      onClick={() => handleStart(bot.id)}
                      disabled={startBot.isPending}
                      data-testid={`button-start-${bot.id}`}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => handleStop(bot.id)}
                      disabled={stopBot.isPending}
                      data-testid={`button-stop-${bot.id}`}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
