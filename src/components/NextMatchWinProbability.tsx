import type { NextMatchWinProbability as NextMatchWinProbabilityPayload } from '@/lib/team-forecasts'

type TeamConfig = {
  abbr: string
  color: string
  secondaryColor: string
}

function formatMatchDate(matchDate: string): string {
  return new Date(matchDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function NextMatchWinProbability({
  forecast,
  getTeamConfig,
  formatTeamName,
}: {
  forecast: NextMatchWinProbabilityPayload | null
  getTeamConfig: (teamId: string) => TeamConfig
  formatTeamName: (teamId: string) => string
}) {
  if (!forecast) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-text-muted">
        No upcoming IPL fixture available for match win probability.
      </div>
    )
  }

  const team1Config = getTeamConfig(forecast.team1_id)
  const team2Config = getTeamConfig(forecast.team2_id)
  const favoriteConfig = getTeamConfig(forecast.favorite_team_id)

  return (
    <div className="rounded-xl border border-border bg-card p-5 overflow-hidden relative">
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${team1Config.color}, ${team2Config.color})`,
        }}
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Next Match Win Probability
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            {formatMatchDate(forecast.match_date)}
            {forecast.venue_id ? ` · ${forecast.venue_id}` : ''}
          </p>
        </div>
        <div
          className="self-start px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: favoriteConfig.color,
            borderColor: `${favoriteConfig.color}55`,
            background: `${favoriteConfig.color}12`,
          }}
        >
          {favoriteConfig.abbr} favorite
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-fira-code text-[11px] font-bold text-white shrink-0"
              style={{ background: team1Config.color }}
            >
              {team1Config.abbr.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-text-primary truncate">
                {team1Config.abbr}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {formatTeamName(forecast.team1_id)}
              </div>
            </div>
          </div>
          <div className="font-fira-code text-2xl font-bold" style={{ color: team1Config.color }}>
            {forecast.team1_probability}%
          </div>
        </div>

        <div className="font-fira-code text-[11px] font-bold text-text-dim tracking-widest">
          VS
        </div>

        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-text-primary truncate">
                {team2Config.abbr}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {formatTeamName(forecast.team2_id)}
              </div>
            </div>
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center font-fira-code text-[11px] font-bold text-white shrink-0"
              style={{ background: team2Config.color }}
            >
              {team2Config.abbr.slice(0, 3)}
            </div>
          </div>
          <div className="font-fira-code text-2xl font-bold" style={{ color: team2Config.color }}>
            {forecast.team2_probability}%
          </div>
        </div>
      </div>

      <div className="mt-4 h-2.5 rounded-full overflow-hidden bg-border flex">
        <div
          className="h-full"
          style={{
            width: `${forecast.team1_probability}%`,
            background: `linear-gradient(90deg, ${team1Config.color}, ${team1Config.secondaryColor})`,
          }}
        />
        <div
          className="h-full"
          style={{
            width: `${forecast.team2_probability}%`,
            background: `linear-gradient(90deg, ${team2Config.secondaryColor}, ${team2Config.color})`,
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {forecast.factors.map(factor => (
          <div
            key={factor.label}
            className="rounded-lg border border-border-subtle bg-surface/50 px-3 py-2"
          >
            <div className="text-[9px] text-text-dim font-bold uppercase tracking-widest">
              {factor.label}
            </div>
            <div className="mt-1 font-fira-code text-xs text-text-secondary">
              {factor.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-muted">
        Lightweight forecast from live standings, recent form, and matchup history.
      </p>
    </div>
  )
}
