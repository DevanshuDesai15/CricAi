'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Plus } from 'lucide-react'
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players by name, country, or team..."
          className="w-full rounded-lg border border-border bg-surface pl-9 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue/30 transition-all"
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-card">
        {filteredPlayers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Search className="w-6 h-6 text-text-dim mx-auto mb-2" />
            <p className="text-sm text-text-muted">No eligible players found.</p>
            <p className="text-xs text-text-dim mt-0.5">Try a different search term.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPlayers.map((player) => (
              <button
                key={player.player_id}
                type="button"
                onClick={() => onAdd(player)}
                className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-text-primary">{player.name}</div>
                  <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-blue-dim text-brand-blue text-[10px] font-semibold">
                      {player.fantasy_role}
                    </span>
                    {player.country && <span>{player.country}</span>}
                    {player.is_overseas && (
                      <span className="text-brand-orange">🌍 Overseas</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-text-secondary tabular-nums">
                      {player.credit_value?.toFixed(1) ?? '8.0'} cr
                    </div>
                    <div className="text-[10px] text-text-dim truncate max-w-[80px]">
                      {player.current_team_id ?? 'No team'}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-brand-blue-dim flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3.5 h-3.5 text-brand-blue" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
