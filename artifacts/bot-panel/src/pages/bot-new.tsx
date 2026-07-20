import { useCreateBot, getListBotsQueryKey, getGetBotsSummaryQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, Save, ArrowLeft, Info } from "lucide-react"
import { Link } from "wouter"

const botSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["discord", "telegram", "slack", "custom"]),
  token: z.string().optional(),
  prefix: z.string().min(1, "Prefix is required"),
  description: z.string().optional(),
})

type BotFormValues = z.infer<typeof botSchema>

export default function BotNew() {
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const createBot = useCreateBot()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BotFormValues>({
    resolver: zodResolver(botSchema),
    defaultValues: { type: "discord", prefix: "!" },
  })

  const onSubmit = (data: BotFormValues) => {
    createBot.mutate({ data }, {
      onSuccess: (newBot) => {
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetBotsSummaryQueryKey() })
        setLocation(`/bots/${newBot.id}`)
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Deployment</h1>
          <p className="text-muted-foreground mt-1">Register a bot. Upload code after creation.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 border border-primary/20 text-sm text-muted-foreground">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <span>Token is optional — you can embed it directly in your bot's code file instead. Upload files after saving.</span>
      </div>

      <Card className="bg-card/40 backdrop-blur border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Configuration
          </CardTitle>
          <CardDescription>Basic setup. Upload your bot's code files on the next screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input id="name" placeholder="e.g. ModerationBot" {...register("name")} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Platform</Label>
                <select id="type" {...register("type")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                  <option value="slack">Slack</option>
                  <option value="custom">Custom / Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Bot Token <span className="text-muted-foreground text-xs ml-1">(optional)</span></Label>
              <Input id="token" type="password" placeholder="Leave blank to embed token in your code file" className="font-mono text-sm" {...register("token")} />
              <p className="text-xs text-muted-foreground">If set, it's stored securely and never returned by the API. You can also hardcode it in your bot script.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="prefix">Command Prefix</Label>
                <Input id="prefix" placeholder="!, /, ?" className="font-mono" {...register("prefix")} />
                {errors.prefix && <p className="text-destructive text-sm">{errors.prefix.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <textarea id="description" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="What does this bot do?" {...register("description")} />
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={isSubmitting || createBot.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Create & Upload Files Next
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
