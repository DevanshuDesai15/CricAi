'use client'

import { ArrowRight } from 'lucide-react'
import type { SwapSuggestion } from '@/lib/recommendation-engine'

interface SwapCardProps {
  swap: SwapSuggestion
  transfersRemaining: number
  applied: boolean
  onApply: (swap: SwapSuggestion) => void
}

export function SwapCard({ swap, transfersRemaining, applied, onApply }: SwapCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Out</div>
          <div className="mt-1 font-medium">{swap.player_out.name}</div>
          <div className="text-xs text-muted-foreground">
            {swap.player_out.predicted_points.toFixed(1)} pts
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-300">In</div>
          <div className="mt-1 font-medium">{swap.player_in.name}</div>
          <div className="text-xs text-muted-foreground">
            {swap.player_in.predicted_points.toFixed(1)} pts
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex gap-3 text-muted-foreground">
          <span className="text-green-300">+{swap.points_delta.toFixed(1)} pts</span>
          <span>{swap.credit_delta >= 0 ? '+' : ''}{swap.credit_delta.toFixed(1)} cr</span>
        </div>
        <button
          type="button"
          onClick={() => onApply(swap)}
          disabled={applied || transfersRemaining <= 0}
          className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-40"
        >
          {applied ? 'Applied' : transfersRemaining > 0 ? 'Apply' : 'No transfers'}
        </button>
      </div>
    </div>
  )
}
