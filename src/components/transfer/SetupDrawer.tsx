'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Circle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { PlayerSearch } from '@/components/transfer/PlayerSearch'
import { PitchFormation } from '@/components/transfer/PitchFormation'
import type { FantasyPlayerSearchResult } from '@/lib/queries/fantasy-players'
import { getSquadCreditTotal, getSquadOverseasCount, getSquadRoleCounts, validateSquad } from '@/lib/squad-validator'

const BOOSTERS = [
  { id: 'double_power', label: 'Double Power' },
  { id: 'indian_warrior', label: 'Indian Warrior' },
  { id: 'triple_captain', label: 'Triple Captain' },
  { id: 'foreign_stars', label: 'Foreign Stars' },
  { id: 'free_hit', label: 'Free Hit' },
  { id: 'wildcard', label: 'Wildcard' },
] as const

interface SetupDrawerProps {
  availablePlayers: FantasyPlayerSearchResult[]
}

type SquadSelection = FantasyPlayerSearchResult & {
  is_captain: boolean
  is_vice_captain: boolean
}

export function SetupDrawer({ availablePlayers }: SetupDrawerProps) {
  const [step, setStep] = useState(1)
  const [squadName, setSquadName] = useState('')
  const [squad, setSquad] = useState<SquadSelection[]>([])
  const [transfersUsed, setTransfersUsed] = useState(0)
  const [boostersUsed, setBoostersUsed] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const roleCounts = useMemo(() => getSquadRoleCounts(squad), [squad])
  const totalCredits = useMemo(() => getSquadCreditTotal(squad), [squad])
  const overseasCount = useMemo(() => getSquadOverseasCount(squad), [squad])

  function addPlayer(player: FantasyPlayerSearchResult) {
    if (squad.some((item) => item.player_id === player.player_id)) return
    setSquad((current) => [...current, { ...player, is_captain: false, is_vice_captain: false }])
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

  function toggleBooster(id: string) {
    setBoostersUsed((current) => (
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    ))
  }

  async function saveSquad() {
    setError(null)

    const validation = validateSquad(squad)
    if (!validation.isValid) {
      setError(validation.issues[0]?.message ?? 'Squad is invalid.')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/setup-squad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            squadName: squadName.trim(),
            players: squad.map((player) => ({
              player_id: player.player_id,
              is_captain: player.is_captain,
              is_vice_captain: player.is_vice_captain,
            })),
            transfersUsed,
            boostersUsed,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          setError(payload?.error ?? 'Failed to save squad.')
          return
        }

        router.refresh()
      } catch {
        setError('Network error — check your connection and try again.')
      }
    })
  }

  const hasCaptain = squad.some((player) => player.is_captain)
  const hasViceCaptain = squad.some((player) => player.is_vice_captain)

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="text-xs uppercase tracking-[0.25em] text-brand-blue font-semibold">
          Setup
        </div>
        <h2 className="mt-2 text-2xl font-bold">Create your starting squad</h2>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((value) => (
            <div
              key={value}
              className={`h-1 flex-1 rounded-full ${value <= step ? 'bg-brand-blue' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6 p-6">
        {step === 1 && (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Team name
              </label>
              <input
                type="text"
                value={squadName}
                onChange={(event) => { setSquadName(event.target.value); setError(null) }}
                placeholder="e.g. Royal Smashers XI"
                maxLength={40}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className={squad.length === 11 ? 'text-brand-green font-semibold' : ''}>
                {squad.length} / 11 players
              </span>
              <span>{totalCredits.toFixed(1)} / 100 credits</span>
              <span>{overseasCount} / 4 overseas</span>
              <span>WK {roleCounts.WK} · BAT {roleCounts.BAT} · AR {roleCounts.AR} · BOWL {roleCounts.BOWL}</span>
            </div>

            <PlayerSearch
              availablePlayers={availablePlayers}
              selectedPlayerIds={squad.map((player) => player.player_id)}
              onAdd={addPlayer}
            />

            {squad.length > 0 && (
              <div className="space-y-2">
                {squad.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.fantasy_role} · {player.credit_value?.toFixed(1) ?? '8.0'} cr
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlayer(player.player_id)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">
              Assign exactly one captain and one vice-captain.
            </p>
            <PitchFormation players={squad} />
            <div className="space-y-2">
              {squad.map((player) => (
                <div key={player.player_id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="font-medium">{player.name}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCaptain(player.player_id)}
                      className={`rounded px-3 py-1 text-xs font-semibold ${player.is_captain ? 'bg-brand-blue-dim text-brand-blue' : 'bg-muted text-muted-foreground'}`}
                    >
                      Captain
                    </button>
                    <button
                      type="button"
                      onClick={() => setViceCaptain(player.player_id)}
                      className={`rounded px-3 py-1 text-xs font-semibold ${player.is_vice_captain ? 'bg-brand-blue-dim text-brand-blue' : 'bg-muted text-muted-foreground'}`}
                    >
                      Vice-Captain
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Transfers used
              </label>
              <input
                type="number"
                min={0}
                max={160}
                value={transfersUsed}
                onChange={(event) => setTransfersUsed(Math.max(0, Math.min(160, Number(event.target.value))))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {160 - transfersUsed} transfers remaining
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Boosters already used
              </div>
              {BOOSTERS.map((booster) => (
                <button
                  key={booster.id}
                  type="button"
                  onClick={() => toggleBooster(booster.id)}
                  className="flex items-center gap-2 text-sm text-left"
                >
                  {boostersUsed.includes(booster.id)
                    ? <CheckCircle2 className="h-4 w-4 text-brand-blue" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                  {booster.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || isPending}
            className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && squadName.trim().length === 0) {
                  setError('Give your team a name before moving on.')
                  return
                }

                if (step === 1 && squad.length !== 11) {
                  setError('Select exactly 11 players before moving on.')
                  return
                }

                if (step === 2 && (!hasCaptain || !hasViceCaptain)) {
                  setError('Pick exactly one captain and one vice-captain.')
                  return
                }

                setError(null)
                setStep((current) => Math.min(3, current + 1))
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={saveSquad}
              disabled={isPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
            >
              {isPending ? 'Saving...' : 'Save squad'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
