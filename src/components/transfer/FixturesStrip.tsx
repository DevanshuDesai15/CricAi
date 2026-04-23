import { Calendar } from 'lucide-react'
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
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        No upcoming IPL fixtures available right now.
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {fixtures.map((fixture) => (
        <div key={fixture.match_id} className="shrink-0 rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">
            {new Date(fixture.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
          <div className="mt-1 font-medium">
            {teamAbbr(fixture.team1_id)} vs {teamAbbr(fixture.team2_id)}
          </div>
        </div>
      ))}
      <Link href="/dashboard" className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
        Full analytics
      </Link>
    </div>
  )
}
