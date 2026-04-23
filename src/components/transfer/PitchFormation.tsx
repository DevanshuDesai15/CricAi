'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FANTASY_ROLES, type FantasySquadPlayer } from '@/lib/fantasy'

interface PitchFormationProps {
  players: Array<FantasySquadPlayer & { country?: string | null }>
  onPlayerClick?: (playerId: string) => void
}

export function PitchFormation({ players, onPlayerClick }: PitchFormationProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {FANTASY_ROLES.map((role) => {
        const rolePlayers = players.filter((player) => player.fantasy_role === role)

        return (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-sm">{role}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rolePlayers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No players selected.</p>
              ) : (
                rolePlayers.map((player) => (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => onPlayerClick?.(player.player_id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-medium text-sm">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.country ?? 'Unknown country'}
                        {player.is_overseas ? ' · Overseas' : ''}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{player.credit_value?.toFixed(1) ?? '8.0'} cr</div>
                      <div>
                        {player.is_captain ? 'C' : player.is_vice_captain ? 'VC' : 'Player'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
