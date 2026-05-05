import type { SeasonWinnerOdds as SeasonWinnerOddsPayload } from '@/lib/team-forecasts'

type TeamConfig = {
  abbr: string
  color: string
  secondaryColor: string
}

export function SeasonWinnerOdds({
  forecast,
  getTeamConfig,
  formatTeamName,
}: {
  forecast: SeasonWinnerOddsPayload
  getTeamConfig: (teamId: string) => TeamConfig
  formatTeamName: (teamId: string) => string
}) {
  if (forecast.teams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center text-text-muted text-xs italic">
        Season forecast unavailable until standings data is loaded.
      </div>
    )
  }

  const favorite = forecast.teams[0]
  const favoriteConfig = getTeamConfig(favorite.team_id)
  const maxProbability = Math.max(...forecast.teams.map(team => team.title_probability), 1)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="p-4 border-b border-border-subtle relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${favoriteConfig.color}18, transparent 62%)`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${favoriteConfig.color}, transparent)` }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] text-text-muted tracking-widest font-bold uppercase">
              Title favorite
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-fira-code text-2xl font-bold text-text-primary">
                {favoriteConfig.abbr}
              </span>
              <span className="text-xs text-text-muted truncate">
                {formatTeamName(favorite.team_id)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-fira-code text-2xl font-bold"
              style={{ color: favoriteConfig.color }}
            >
              {favorite.title_probability.toFixed(1)}%
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-widest">
              forecast
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-1">
        {forecast.teams.map(team => {
          const cfg = getTeamConfig(team.team_id)
          const barWidth = (team.title_probability / maxProbability) * 100

          return (
            <div
              key={team.team_id}
              className="grid grid-cols-[22px_34px_minmax(0,1fr)_50px] items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.02]"
            >
              <span className="font-fira-code text-[11px] text-text-dim">
                {team.rank}
              </span>
              <span
                className="h-7 rounded-lg flex items-center justify-center font-fira-code text-[10px] font-bold text-white"
                style={{ background: cfg.color }}
              >
                {cfg.abbr.slice(0, 3)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-primary truncate">
                    {formatTeamName(team.team_id)}
                  </span>
                  <span className="text-[10px] text-text-muted shrink-0">
                    {team.current_points} pts
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${cfg.color}, ${cfg.secondaryColor})`,
                    }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="font-fira-code text-xs font-bold text-text-primary">
                  {team.title_probability.toFixed(1)}%
                </div>
                <div className="text-[9px] text-text-dim">
                  {team.form_label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-border-subtle text-[10px] text-text-muted leading-relaxed">
        Live dashboard forecast using standings, recent form, and remaining fixtures.
      </div>
    </div>
  )
}
