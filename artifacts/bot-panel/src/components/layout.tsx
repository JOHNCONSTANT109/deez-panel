import * as React from "react"
import { Link, useLocation } from "wouter"
import { Terminal, LayoutDashboard, PlusCircle, BookOpen } from "lucide-react"

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bots/new", label: "Add Bot", icon: PlusCircle },
    { href: "/deploy", label: "Deployment Guide", icon: BookOpen },
  ]

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur flex flex-col h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-mono font-bold tracking-tight">
            <Terminal className="w-5 h-5" />
            <span>DEEZ_PANEL</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location === item.href || (location.startsWith("/bots/") && item.href === "/" && location !== "/bots/new")
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`} data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground font-mono flex items-center justify-between">
            <span>SYS.STATE</span>
            <span className="text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>ONLINE</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
