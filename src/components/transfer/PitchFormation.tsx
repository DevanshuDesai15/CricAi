'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FANTASY_ROLES, type FantasySquadPlayer } from '@/lib/fantasy'

interface PitchFormationProps {
  players: Array<FantasySquadPlayer & { country?: string | null }>
  onPlayerClick?: (playerId: string) => void
}

const ROLE_CONFIG: Record<string, { color: string; bg: string; borderColor: string; icon: string }> = {
  WK: { color: 'text-amber-300', bg: 'bg-amber-500/8', borderColor: 'border-amber-500/20', icon: '🧤' },
  BAT: { color: 'text-blue-300', bg: 'bg-blue-500/8', borderColor: 'border-blue-500/20', icon: '🏏' },
  AR: { color: 'text-emerald-300', bg: 'bg-emerald-500/8', borderColor: 'border-emerald-500/20', icon: '⚡' },
  BOWL: { color: 'text-rose-300', bg: 'bg-rose-500/8', borderColor: 'border-rose-500/20', icon: '🎯' },
}

export function PitchFormation({ players, onPlayerClick }: PitchFormationProps) {
  return (
    <div className="grid gap-4 grid-cols-1 items-start">
      {FANTASY_ROLES.map((role) => {
        const rolePlayers = players.filter((player) => player.fantasy_role === role)
        const config = ROLE_CONFIG[role] ?? { color: 'text-text-primary', bg: 'bg-card', borderColor: 'border-border', icon: '👤' }

        return (
          <div
            key={role}
            className={`rounded-xl border ${config.borderColor} ${config.bg} overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/10`}
          >
            {/* Role header */}
            <div className={`px-4 py-3 border-b ${config.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{config.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-[0.2em] ${config.color}`}>
                    {role}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted font-medium tabular-nums">
                  {rolePlayers.length} selected
                </span>
              </div>
            </div>

            {/* Players list */}
            <div className="p-2 space-y-1.5">
              {rolePlayers.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-text-muted">No players selected</p>
                </div>
              ) : (
                rolePlayers.map((player) => (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => onPlayerClick?.(player.player_id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 text-left hover:bg-card-hover hover:border-border transition-all duration-150 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text-primary truncate">{player.name}</span>
                        {player.is_captain && (
                          <span className="shrink-0 text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                            C
                          </span>
                        )}
                        {player.is_vice_captain && (
                          <span className="shrink-0 text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-brand-orange/15 text-brand-orange border border-brand-orange/20">
                            VC
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {player.country ?? 'Unknown'}
                        {player.is_overseas ? ' · 🌍 Overseas' : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right ml-2">
                      <div className="text-xs font-semibold text-text-secondary tabular-nums">
                        {player.credit_value?.toFixed(1) ?? '8.0'}
                      </div>
                      <div className="text-[10px] text-text-muted">credits</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
