'use client'

import { useEffect, useState } from 'react'
import type { UpcomingMatch } from '@/lib/queries/matches'

type PredictionRow = {
  rank: number
  player_id: string
  player_name: string
  team_id: string
  predicted_fantasy_points: number
}

type PredictionPayload = {
  match_id: string
  model_version: string
  generated_at: string
  predictions: PredictionRow[]
}

function formatTeamLabel(teamId: string) {
  return teamId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatFixtureLabel(match: UpcomingMatch) {
  const date = new Date(match.match_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })

  return `${formatTeamLabel(match.team1_id)} vs ${formatTeamLabel(match.team2_id)} · ${date}`
}

export function UpcomingPredictions({ matches }: { matches: UpcomingMatch[] }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.match_id ?? '')
  const [payload, setPayload] = useState<PredictionPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(matches[0]?.match_id))
  const resolvedMatchId = matches.some(match => match.match_id === selectedMatchId)
    ? selectedMatchId
    : (matches[0]?.match_id ?? '')

  useEffect(() => {
    if (!resolvedMatchId) return

    let cancelled = false

    fetch(`/api/predictions/match/${resolvedMatchId}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error((data as { message?: string }).message ?? 'Prediction failed')
        }

        return data as PredictionPayload
      })
      .then(data => {
        if (!cancelled) {
          setPayload(data)
          setError(null)
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) {
          setPayload(null)
          setError(fetchError.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [resolvedMatchId])

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-text-muted">
        No upcoming IPL fixtures available.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Upcoming Predictions</h3>
        <p className="mt-1 text-xs text-text-muted">
          Likely XI inferred from each team&apos;s most recent completed match unless explicit team composition data exists.
        </p>
      </div>

      <select
        value={resolvedMatchId}
        onChange={(event) => {
          setSelectedMatchId(event.target.value)
          setPayload(null)
          setError(null)
          setLoading(true)
        }}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"
      >
        {matches.map(match => (
          <option key={match.match_id} value={match.match_id}>
            {formatFixtureLabel(match)}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-text-muted">Loading predictions…</p>}
      {error && <p className="text-sm text-brand-orange">{error}</p>}

      {payload && (
        <div className="space-y-3">
          <div className="text-xs text-text-dim">
            Model: {payload.model_version}
          </div>
          <div className="space-y-2">
            {payload.predictions.slice(0, 12).map(player => (
              <div
                key={player.player_id}
                className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    #{player.rank} {player.player_name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatTeamLabel(player.team_id)}
                  </div>
                </div>
                <div className="font-fira-code text-sm text-brand-blue">
                  {player.predicted_fantasy_points}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
