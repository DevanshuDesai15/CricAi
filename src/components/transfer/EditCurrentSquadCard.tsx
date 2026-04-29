'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, X, ChevronDown, ChevronUp, Shield, Save } from 'lucide-react'
import { PlayerSearch } from '@/components/transfer/PlayerSearch'
import type { FantasyPlayerSearchResult } from '@/lib/queries/fantasy-players'
import type { UserSquadPlayer } from '@/lib/queries/user-squad'
import { getSquadCreditTotal, getSquadOverseasCount, getSquadRoleCounts, validateSquad } from '@/lib/squad-validator'
import { MAX_TRANSFERS_PER_SEASON } from '@/lib/transfer-setup'

type EditableSquadPlayer = UserSquadPlayer

interface EditCurrentSquadCardProps {
  squadName: string
  initialSquad: UserSquadPlayer[]
  availablePlayers: FantasyPlayerSearchResult[]
  transfersUsed: number
}

export function EditCurrentSquadCard({
  squadName,
  initialSquad,
  availablePlayers,
  transfersUsed,
}: EditCurrentSquadCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [squad, setSquad] = useState<EditableSquadPlayer[]>(initialSquad)
  const [used, setUsed] = useState(String(transfersUsed))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const roleCounts = useMemo(() => getSquadRoleCounts(squad), [squad])
  const totalCredits = useMemo(() => getSquadCreditTotal(squad), [squad])
  const overseasCount = useMemo(() => getSquadOverseasCount(squad), [squad])
  const selectedIds = useMemo(() => squad.map((player) => player.player_id), [squad])
  const numericTransfersUsed = Number(used)
  const transfersLeft = Number.isFinite(numericTransfersUsed)
    ? Math.max(0, MAX_TRANSFERS_PER_SEASON - Math.max(0, Math.min(MAX_TRANSFERS_PER_SEASON, Math.trunc(numericTransfersUsed))))
    : MAX_TRANSFERS_PER_SEASON - transfersUsed

  function reset() {
    setSquad(initialSquad)
    setUsed(String(transfersUsed))
    setError(null)
    setIsEditing(false)
  }

  function addPlayer(player: FantasyPlayerSearchResult) {
    if (squad.length >= 11 || selectedIds.includes(player.player_id)) return
    setSquad((current) => [...current, {
      player_id: player.player_id,
      name: player.name,
      fantasy_role: player.fantasy_role,
      current_team_id: player.current_team_id,
      credit_value: player.credit_value ?? 8,
      is_overseas: player.is_overseas,
      country: player.country,
      is_captain: false,
      is_vice_captain: false,
    }])
    setError(null)
  }

  function removePlayer(playerId: string) {
    setSquad((current) => current.filter((player) => player.player_id !== playerId))
    setError(null)
  }

  function setCaptain(playerId: string) {
    setSquad((current) => current.map((player) => ({
      ...player,
      is_captain: player.player_id === playerId,
      is_vice_captain: player.player_id === playerId ? false : player.is_vice_captain,
    })))
  }

  function setViceCaptain(playerId: string) {
    setSquad((current) => current.map((player) => ({
      ...player,
      is_vice_captain: player.player_id === playerId,
      is_captain: player.player_id === playerId ? false : player.is_captain,
    })))
  }

  async function save() {
    setError(null)

    const validation = validateSquad(squad)
    if (!validation.isValid) {
      setError(validation.issues[0]?.message ?? 'Squad is invalid.')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/update-current-squad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transfersUsed: Number(used),
            players: squad.map((player) => ({
              player_id: player.player_id,
              is_captain: Boolean(player.is_captain),
              is_vice_captain: Boolean(player.is_vice_captain),
            })),
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          setError(payload?.error ?? 'Failed to update current team.')
          return
        }

        setIsEditing(false)
        router.refresh()
      } catch {
        setError('Network error. Try again.')
      }
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-card-hover transition-colors duration-150"
        onClick={() => setIsEditing((current) => !current)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-blue-dim flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-brand-blue" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Current Team</div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">{squadName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
            <span className="tabular-nums">{initialSquad.length} players</span>
            <span className="text-text-dim">·</span>
            <span className="tabular-nums">{MAX_TRANSFERS_PER_SEASON - transfersUsed} left</span>
          </div>
          <div className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-text-muted hover:bg-card-hover transition-colors">
            {isEditing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-border">
          {/* Stats bar */}
          <div className="flex flex-wrap gap-3 px-5 py-3 bg-surface/50 border-b border-border">
            <span className={`text-xs px-2 py-0.5 rounded-full ${squad.length === 11 ? 'bg-brand-green-dim text-brand-green border border-brand-green/20' : 'bg-card text-text-muted border border-border'}`}>
              {squad.length} / 11 players
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-card text-text-muted border border-border tabular-nums">
              {totalCredits.toFixed(1)} / 100 cr
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-card text-text-muted border border-border tabular-nums">
              {overseasCount} / 4 overseas
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-card text-text-muted border border-border">
              WK {roleCounts.WK} · BAT {roleCounts.BAT} · AR {roleCounts.AR} · BOWL {roleCounts.BOWL}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Transfers used */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Transfers used
              </span>
              <input
                type="number"
                min={0}
                max={MAX_TRANSFERS_PER_SEASON}
                value={used}
                onChange={(event) => setUsed(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue/30 transition-all"
              />
              <span className="mt-1.5 block text-xs text-text-muted tabular-nums">{transfersLeft} transfers left</span>
            </label>

            {/* Players list */}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {squad.map((player) => (
                <div key={player.player_id} className="rounded-lg border border-border bg-surface/50 hover:border-border-accent transition-all duration-150">
                  <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary">{player.name}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {player.fantasy_role} · {(player.credit_value ?? 8).toFixed(1)} cr
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlayer(player.player_id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                      aria-label={`Remove ${player.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5 px-3.5 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setCaptain(player.player_id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider transition-all ${player.is_captain ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/25' : 'bg-surface text-text-muted border border-border hover:border-border-accent'}`}
                    >
                      C
                    </button>
                    <button
                      type="button"
                      onClick={() => setViceCaptain(player.player_id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider transition-all ${player.is_vice_captain ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/25' : 'bg-surface text-text-muted border border-border hover:border-border-accent'}`}
                    >
                      VC
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {squad.length < 11 && (
              <PlayerSearch
                availablePlayers={availablePlayers}
                selectedPlayerIds={selectedIds}
                onAdd={addPlayer}
              />
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2.5">
                <span className="shrink-0 mt-px">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text-muted hover:bg-card-hover hover:text-text-secondary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20 disabled:opacity-60 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3 h-3" />
                {isPending ? 'Saving...' : 'Save team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
