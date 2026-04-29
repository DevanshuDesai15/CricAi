'use client'

import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { SwapSuggestion } from '@/lib/recommendation-engine'

interface SwapCardProps {
  swap: SwapSuggestion
  transfersRemaining: number
  applied: boolean
  onApply: (swap: SwapSuggestion) => void
}

export function SwapCard({ swap, transfersRemaining, applied, onApply }: SwapCardProps) {
  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${applied ? 'border-brand-green/30 bg-brand-green-dim' : 'border-border bg-card hover:border-border-accent'}`}>
      {/* Swap visual */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        {/* Player Out */}
        <div className="p-4 border-r border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400">Out</span>
          </div>
          <div className="font-semibold text-sm text-text-primary">{swap.player_out.name}</div>
          <div className="text-xs text-text-muted mt-0.5 tabular-nums">
            {swap.player_out.predicted_points.toFixed(1)} pts predicted
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center px-2 bg-border/20">
          <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center">
            <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
          </div>
        </div>

        {/* Player In */}
        <div className="p-4 border-l border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-400">In</span>
          </div>
          <div className="font-semibold text-sm text-text-primary">{swap.player_in.name}</div>
          <div className="text-xs text-text-muted mt-0.5 tabular-nums">
            {swap.player_in.predicted_points.toFixed(1)} pts predicted
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-surface/50">
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold tabular-nums">
            <TrendingUp className="w-3 h-3" />
            +{swap.points_delta.toFixed(1)} pts
          </span>
          <span className="text-text-muted tabular-nums">
            {swap.credit_delta >= 0 ? '+' : ''}{swap.credit_delta.toFixed(1)} cr
          </span>
        </div>
        <button
          type="button"
          onClick={() => onApply(swap)}
          disabled={applied || transfersRemaining <= 0}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:opacity-40 ${
            applied
              ? 'bg-brand-green/15 text-brand-green border border-brand-green/25 cursor-default'
              : 'bg-brand-blue text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20'
          }`}
        >
          {applied ? '✓ Applied' : transfersRemaining > 0 ? 'Apply' : 'No transfers'}
        </button>
      </div>
    </div>
  )
}
