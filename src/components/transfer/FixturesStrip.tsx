import { Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { UpcomingMatch } from '@/lib/queries/matches'

interface FixturesStripProps {
  fixtures: UpcomingMatch[]
}

function teamAbbr(teamId: string) {
  return teamId
    .split('_')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()
}

export function FixturesStrip({ fixtures }: FixturesStripProps) {
  if (fixtures.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-5 py-4 text-sm text-text-secondary">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-blue-dim">
          <Calendar className="h-4 w-4 text-brand-blue" />
        </div>
        No upcoming IPL fixtures available right now.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted pl-1">
        Upcoming Fixtures
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {fixtures.map((fixture) => (
          <div
            key={fixture.match_id}
            className="group shrink-0 rounded-xl border border-border bg-card hover:border-brand-blue/30 hover:bg-card-hover transition-all duration-200 px-5 py-3.5 min-w-[160px]"
          >
            <div className="text-[11px] text-text-muted font-medium">
              {new Date(fixture.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-bold font-outfit text-text-primary">{teamAbbr(fixture.team1_id)}</span>
              <span className="text-[10px] text-text-muted font-medium px-1.5 py-0.5 rounded bg-border/50">VS</span>
              <span className="text-sm font-bold font-outfit text-text-primary">{teamAbbr(fixture.team2_id)}</span>
            </div>
          </div>
        ))}
        <Link
          href="/dashboard"
          className="group shrink-0 rounded-xl border border-dashed border-border hover:border-brand-blue/40 bg-transparent px-5 py-3.5 flex items-center gap-2 text-sm text-text-muted hover:text-brand-blue transition-all duration-200 min-w-[140px]"
        >
          Full analytics
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
