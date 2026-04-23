'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Sparkles } from 'lucide-react'
import type { UserSquadPlayer } from '@/lib/queries/user-squad'
import type { RecommendationResult, SwapSuggestion } from '@/lib/recommendation-engine'
import { SwapCard } from '@/components/transfer/SwapCard'

interface RecommendationsPanelProps {
  initialSquad: UserSquadPlayer[]
  initialTransfersUsed: number
  onPendingSquadChange: (nextSquad: UserSquadPlayer[]) => void
}

interface RecommendationApiResponse extends RecommendationResult {
  transfers_remaining: number
  fixtures_considered: string[]
  scoring_available: boolean
}

export function RecommendationsPanel({
  initialSquad,
  initialTransfersUsed,
  onPendingSquadChange,
}: RecommendationsPanelProps) {
  const [result, setResult] = useState<RecommendationApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingSquad, setWorkingSquad] = useState(initialSquad)
  const [appliedSwaps, setAppliedSwaps] = useState<SwapSuggestion[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    fetch('/api/transfer-recommendations', { method: 'POST' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error ?? 'Failed to load recommendations.')
        }
        return payload as RecommendationApiResponse
      })
      .then((payload) => {
        if (!cancelled) {
          setResult(payload)
          setError(null)
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) {
          setError(fetchError.message)
          setResult(null)
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
  }, [])

  useEffect(() => {
    onPendingSquadChange(workingSquad)
  }, [onPendingSquadChange, workingSquad])

  const transfersRemaining = useMemo(() => {
    const base = result?.transfers_remaining ?? Math.max(0, 160 - initialTransfersUsed)
    return Math.max(0, base - appliedSwaps.length)
  }, [appliedSwaps.length, initialTransfersUsed, result?.transfers_remaining])

  function applySwap(swap: SwapSuggestion) {
    if (appliedSwaps.some((applied) => applied.player_out.player_id === swap.player_out.player_id)) return

    setAppliedSwaps((current) => [...current, swap])
    setWorkingSquad((current) => current.map((player) => {
      if (player.player_id !== swap.player_out.player_id) return player
      return {
        player_id: swap.player_in.player_id,
        name: swap.player_in.name,
        fantasy_role: swap.player_in.fantasy_role,
        current_team_id: swap.player_in.current_team_id,
        credit_value: swap.player_in.credit_value,
        is_overseas: swap.player_in.is_overseas,
        country: player.country,
        is_captain: player.is_captain,
        is_vice_captain: player.is_vice_captain,
      }
    }))
  }

  function confirmTransfers() {
    startTransition(async () => {
      const response = await fetch('/api/confirm-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: workingSquad.map((player) => ({
            player_id: player.player_id,
            is_captain: player.is_captain,
            is_vice_captain: player.is_vice_captain,
          })),
          transfersApplied: appliedSwaps.length,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(payload?.error ?? 'Failed to confirm transfers.')
        return
      }

      router.refresh()
    })
  }

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading recommendations...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-red-300">{error}</div>
  }

  if (!result || !result.scoring_available || result.swaps.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Predictions are not available for upcoming fixtures yet, so transfer suggestions are currently empty.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <div className="font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recommendations</div>
        <div className={transfersRemaining === 0 ? 'text-red-300' : 'text-green-300'}>
          {transfersRemaining} / 160 transfers left
        </div>
      </div>

      {result.swaps.map((swap) => (
        <SwapCard
          key={swap.player_out.player_id}
          swap={swap}
          transfersRemaining={transfersRemaining}
          applied={appliedSwaps.some((applied) => applied.player_out.player_id === swap.player_out.player_id)}
          onApply={applySwap}
        />
      ))}

      {appliedSwaps.length > 0 && (
        <button
          type="button"
          onClick={confirmTransfers}
          disabled={isPending}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-primary-foreground disabled:opacity-40"
        >
          {isPending ? 'Confirming...' : `Confirm ${appliedSwaps.length} transfer${appliedSwaps.length > 1 ? 's' : ''}`}
        </button>
      )}

      {result.captain_suggestion && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Crown className="mt-0.5 h-4 w-4 text-amber-300" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Captain pick</div>
            <div className="mt-1 font-medium">{result.captain_suggestion.name}</div>
            <div className="text-xs text-muted-foreground">
              {result.captain_suggestion.predicted_points.toFixed(1)} predicted points
            </div>
          </div>
        </div>
      )}

      {!result.captain_suggestion && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Captain guidance will appear when scoring input is available.
        </div>
      )}
    </div>
  )
}
