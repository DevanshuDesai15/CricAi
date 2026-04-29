'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, X } from 'lucide-react'
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
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Current team</div>
          <div className="mt-1 text-sm font-medium">{squadName}</div>
          <div className="text-xs text-muted-foreground">
            {initialSquad.length} players · {transfersUsed} used · {MAX_TRANSFERS_PER_SEASON - transfersUsed} left
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Edit current team"
          title="Edit current team"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {isEditing && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className={squad.length === 11 ? 'text-brand-green font-semibold' : ''}>{squad.length} / 11 players</span>
            <span>{totalCredits.toFixed(1)} / 100 cr</span>
            <span>{overseasCount} / 4 overseas</span>
            <span>WK {roleCounts.WK} · BAT {roleCounts.BAT} · AR {roleCounts.AR} · BOWL {roleCounts.BOWL}</span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Transfers used
            </span>
            <input
              type="number"
              min={0}
              max={MAX_TRANSFERS_PER_SEASON}
              value={used}
              onChange={(event) => setUsed(event.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
            <span className="mt-1 block text-xs text-muted-foreground">{transfersLeft} transfers left</span>
          </label>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {squad.map((player) => (
              <div key={player.player_id} className="rounded border border-border px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.fantasy_role} · {(player.credit_value ?? 8).toFixed(1)} cr
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlayer(player.player_id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${player.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCaptain(player.player_id)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${player.is_captain ? 'bg-brand-blue-dim text-brand-blue' : 'bg-muted text-muted-foreground'}`}
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => setViceCaptain(player.player_id)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${player.is_vice_captain ? 'bg-brand-blue-dim text-brand-blue' : 'bg-muted text-muted-foreground'}`}
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

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="rounded bg-brand-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isPending ? 'Saving...' : 'Save team'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
