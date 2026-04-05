'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import React from 'react'
import { 
  LayoutDashboard, 
  Activity, 
  Trophy, 
  Zap 
} from 'lucide-react'

// ── Nav items ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
]

// ── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="w-56 h-screen sticky top-0 bg-surface border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-fira-code text-[15px] font-bold brand-gradient bg-clip-text text-transparent tracking-tight leading-none">
              CRIC<span>AI</span>
            </div>
            <div className="text-[10px] text-text-muted tracking-widest mt-0.5 uppercase">
              Fantasy Intel
            </div>
          </div>
        </Link>
      </div>

      {/* Section label */}
      <div className="px-4 pt-5 pb-2">
        <div className="text-[10px] font-semibold text-text-dim tracking-widest pl-3 uppercase">
          Navigation
        </div>
      </div>

      {/* Nav links */}
      <nav className="px-3 flex-1 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link 
              key={href} 
              href={href} 
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-brand-blue-dim text-brand-blue border border-brand-blue-dim/20' 
                  : 'text-text-muted hover:bg-card hover:text-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 pb-6">
        {/* Divider */}
        <div className="h-px bg-border mb-4" />

        {/* Phase badge */}
        <div className="bg-brand-blue-dim border border-brand-blue-dim/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_6px_var(--color-brand-green)] animate-pulse" />
            <div className="text-[10px] text-brand-blue font-bold tracking-widest uppercase">
              Phase 2 Active
            </div>
          </div>
          <div className="text-[11px] text-text-muted leading-tight">
            Live Data & ML Foundation
          </div>
        </div>

        {/* Version */}
        <div className="mt-3 text-[11px] text-text-dim flex items-center gap-1.5 pl-1.5 font-medium">
          <Activity className="w-3 h-3" />
          <span>v0.2.0-alpha</span>
        </div>
      </div>
    </aside>
  )
}

export default function CricAiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  if (isLandingPage) {
    return (
      <main className="flex-1 min-h-screen">
        {children}
      </main>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  )
}
