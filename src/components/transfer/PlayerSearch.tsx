'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { FantasyPlayerSearchResult } from '@/lib/queries/fantasy-players'

/**
 * Matches a player name against a query using token-prefix logic.
 * Each query word must be a prefix of at least one name word.
 * "V Kohli" → ["v", "kohli"] both match tokens in "Virat Kohli" ✓
 * "Kohli"   → ["kohli"] matches "kohli" in "Virat Kohli" ✓
 * "Virat"   → ["virat"] matches "virat" ✓
 */
function matchesTokens(name: string, query: string): boolean {
  const nameTokens = name.toLowerCase().split(/\s+/)
  const queryTokens = query.split(/\s+/).filter(Boolean)
  return queryTokens.every((qt) => nameTokens.some((nt) => nt.startsWith(qt)))
}

interface PlayerSearchProps {
  availablePlayers: FantasyPlayerSearchResult[]
  selectedPlayerIds: string[]
  onAdd: (player: FantasyPlayerSearchResult) => void
}

export function PlayerSearch({ availablePlayers, selectedPlayerIds, onAdd }: PlayerSearchProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredPlayers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    return availablePlayers
      .filter((player) => !selectedPlayerIds.includes(player.player_id))
      .filter((player) => {
        if (normalized.length === 0) return true
        return (
          matchesTokens(player.name, normalized)
            || player.country?.toLowerCase().includes(normalized)
            || player.current_team_id?.toLowerCase().includes(normalized)
        )
      })
      .slice(0, 20)
  }, [availablePlayers, deferredQuery, selectedPlayerIds])

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search players by name, country, or team..."
      />

      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-card">
        {filteredPlayers.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No eligible players found for that search.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPlayers.map((player) => (
              <button
                key={player.player_id}
                type="button"
                onClick={() => onAdd(player)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {player.fantasy_role}
                    {player.country ? ` · ${player.country}` : ''}
                    {player.is_overseas ? ' · Overseas' : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div>{player.credit_value?.toFixed(1) ?? '8.0'} cr</div>
                  <div>{player.current_team_id ?? 'No team'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
