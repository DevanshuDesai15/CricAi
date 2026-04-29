'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Sparkles, Zap, Loader2 } from 'lucide-react'
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

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">AI Recommendations</span>
          </div>
        </div>
        <div className="px-5 py-8 flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
          <p className="text-sm text-text-muted">Analyzing your squad...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-500/15">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Recommendations</span>
          </div>
        </div>
        <div className="px-5 py-4 text-sm text-red-300">{error}</div>
      </div>
    )
  }

  // Empty / no scoring state
  if (!result || !result.scoring_available || result.swaps.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">AI Recommendations</span>
          </div>
        </div>
        <div className="px-5 py-6 text-center">
          <Zap className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">
            Predictions are not available for upcoming fixtures yet.
          </p>
          <p className="text-xs text-text-dim mt-1">
            Transfer suggestions will appear once scoring data is ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-blue-dim flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Recommendations</span>
        </div>
        <div className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full ${
          transfersRemaining === 0
            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
            : 'bg-brand-green-dim text-brand-green border border-brand-green/20'
        }`}>
          {transfersRemaining} / 160 left
        </div>
      </div>

      {/* Swap cards */}
      {result.swaps.map((swap) => (
        <SwapCard
          key={swap.player_out.player_id}
          swap={swap}
          transfersRemaining={transfersRemaining}
          applied={appliedSwaps.some((applied) => applied.player_out.player_id === swap.player_out.player_id)}
          onApply={applySwap}
        />
      ))}

      {/* Confirm button */}
      {appliedSwaps.length > 0 && (
        <button
          type="button"
          onClick={confirmTransfers}
          disabled={isPending}
          className="w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue/80 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all duration-200 disabled:opacity-40"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming...
            </span>
          ) : (
            `Confirm ${appliedSwaps.length} transfer${appliedSwaps.length > 1 ? 's' : ''}`
          )}
        </button>
      )}

      {/* Captain suggestion */}
      {result.captain_suggestion && (
        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-amber-500/3 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Crown className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">Captain pick</div>
              <div className="mt-1 font-semibold text-text-primary">{result.captain_suggestion.name}</div>
              <div className="text-xs text-text-muted mt-0.5 tabular-nums">
                {result.captain_suggestion.predicted_points.toFixed(1)} predicted points
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vice Captain suggestion */}
      {result.vc_suggestion && (
        <div className="rounded-xl border border-brand-orange/25 bg-gradient-to-r from-brand-orange/8 to-brand-orange/3 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/15 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-4 w-4 text-brand-orange" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-orange">Vice Captain</div>
              <div className="mt-1 font-semibold text-text-primary">{result.vc_suggestion.name}</div>
              <div className="text-xs text-text-muted mt-0.5 tabular-nums">
                {result.vc_suggestion.predicted_points.toFixed(1)} predicted points
              </div>
            </div>
          </div>
        </div>
      )}

      {!result.captain_suggestion && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
          <Sparkles className="h-4 w-4 text-text-muted shrink-0" />
          <span className="text-sm text-text-muted">
            Captain guidance will appear when scoring input is available.
          </span>
        </div>
      )}
    </div>
  )
}
