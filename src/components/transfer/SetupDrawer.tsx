'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Circle, CheckCircle2, ShieldAlert, Users, Crown, Settings, X, Sparkles } from 'lucide-react'
import { PlayerSearch } from '@/components/transfer/PlayerSearch'
import { PitchFormation } from '@/components/transfer/PitchFormation'
import type { FantasyPlayerSearchResult } from '@/lib/queries/fantasy-players'
import { getSquadCreditTotal, getSquadOverseasCount, getSquadRoleCounts, validateSquad } from '@/lib/squad-validator'

const BOOSTERS = [
  { id: 'double_power', label: 'Double Power', icon: '⚡' },
  { id: 'indian_warrior', label: 'Indian Warrior', icon: '🇮🇳' },
  { id: 'triple_captain', label: 'Triple Captain', icon: '👑' },
  { id: 'foreign_stars', label: 'Foreign Stars', icon: '🌍' },
  { id: 'free_hit', label: 'Free Hit', icon: '🎯' },
  { id: 'wildcard', label: 'Wildcard', icon: '🃏' },
] as const

const STEPS = [
  { number: 1, label: 'Build Squad', icon: Users },
  { number: 2, label: 'Pick Captain', icon: Crown },
  { number: 3, label: 'Settings', icon: Settings },
]

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
  const [totalPoints, setTotalPoints] = useState(0)
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
            totalPoints,
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
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 to-brand-orange/5" />
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-blue">
              Setup
            </span>
          </div>
          <h2 className="text-2xl font-bold font-outfit tracking-tight">Create your starting squad</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Build your dream XI in three easy steps.
          </p>

          {/* Step indicators */}
          <div className="mt-5 flex gap-2">
            {STEPS.map((s) => {
              const isActive = s.number === step
              const isDone = s.number < step
              const StepIcon = s.icon
              return (
                <div key={s.number} className="flex-1">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-blue-dim border-brand-blue/25 text-brand-blue'
                        : isDone
                          ? 'bg-brand-green-dim border-brand-green/20 text-brand-green'
                          : 'bg-transparent border-border text-text-dim'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-semibold truncate">{s.label}</span>
                  </div>
                  <div className={`h-1 rounded-full mt-2 transition-all duration-300 ${
                    isDone ? 'bg-brand-green' : isActive ? 'bg-brand-blue' : 'bg-border'
                  }`} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        {step === 1 && (
          <>
            {/* Team name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Team name
              </label>
              <input
                type="text"
                value={squadName}
                onChange={(event) => { setSquadName(event.target.value); setError(null) }}
                placeholder="e.g. Royal Smashers XI"
                maxLength={40}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue/30 transition-all"
              />
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${squad.length === 11 ? 'bg-brand-green-dim text-brand-green border border-brand-green/20' : 'bg-card text-text-muted border border-border'}`}>
                {squad.length} / 11 players
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium tabular-nums ${totalCredits > 100 ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-card text-text-muted border border-border'}`}>
                {totalCredits.toFixed(1)} / 100 credits
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium tabular-nums ${overseasCount > 4 ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-card text-text-muted border border-border'}`}>
                {overseasCount} / 4 overseas
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card text-text-muted border border-border">
                WK {roleCounts.WK} · BAT {roleCounts.BAT} · AR {roleCounts.AR} · BOWL {roleCounts.BOWL}
              </span>
            </div>

            {/* Player search */}
            <PlayerSearch
              availablePlayers={availablePlayers}
              selectedPlayerIds={squad.map((player) => player.player_id)}
              onAdd={addPlayer}
            />

            {/* Selected players */}
            {squad.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-2">
                  Selected Players ({squad.length})
                </div>
                {squad.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3 hover:border-border-accent transition-all duration-150">
                    <div>
                      <div className="font-medium text-sm">{player.name}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-blue-dim text-brand-blue text-[10px] font-semibold">
                          {player.fantasy_role}
                        </span>
                        <span className="tabular-nums">{player.credit_value?.toFixed(1) ?? '8.0'} cr</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlayer(player.player_id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-brand-blue-dim border border-brand-blue/15 px-4 py-3">
              <Crown className="w-5 h-5 text-brand-blue shrink-0" />
              <p className="text-sm text-text-secondary">
                Assign exactly one <span className="text-brand-blue font-semibold">captain</span> and one <span className="text-brand-orange font-semibold">vice-captain</span>.
              </p>
            </div>
            <PitchFormation players={squad} />
            <div className="space-y-2">
              {squad.map((player) => (
                <div key={player.player_id} className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3 hover:border-border-accent transition-all">
                  <div className="font-medium text-sm">{player.name}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCaptain(player.player_id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-all ${player.is_captain ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/25 shadow-sm shadow-brand-blue/10' : 'bg-surface text-text-muted border border-border hover:border-border-accent'}`}
                    >
                      Captain
                    </button>
                    <button
                      type="button"
                      onClick={() => setViceCaptain(player.player_id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-all ${player.is_vice_captain ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/25 shadow-sm shadow-brand-orange/10' : 'bg-surface text-text-muted border border-border hover:border-border-accent'}`}
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
            <div className="grid grid-cols-2 gap-4">
              {/* Transfers used */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Transfers used
                </label>
                <input
                  type="number"
                  min={0}
                  max={160}
                  value={transfersUsed}
                  onChange={(event) => setTransfersUsed(Math.max(0, Math.min(160, Number(event.target.value))))}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue/30 transition-all"
                />
                <p className="mt-2 text-xs text-text-muted tabular-nums">
                  {160 - transfersUsed} transfers remaining
                </p>
              </div>

              {/* Total points */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Total points
                </label>
                <input
                  type="number"
                  min={0}
                  value={totalPoints}
                  onChange={(event) => setTotalPoints(Math.max(0, Number(event.target.value)))}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 transition-all"
                />
                <p className="mt-2 text-xs text-text-muted tabular-nums">
                  Season total
                </p>
              </div>
            </div>

            {/* Boosters */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Boosters already used
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BOOSTERS.map((booster) => {
                  const isUsed = boostersUsed.includes(booster.id)
                  return (
                    <button
                      key={booster.id}
                      type="button"
                      onClick={() => toggleBooster(booster.id)}
                      className={`flex items-center gap-2.5 text-sm text-left rounded-lg border px-3 py-2.5 transition-all duration-150 ${
                        isUsed
                          ? 'bg-brand-blue-dim border-brand-blue/20 text-brand-blue'
                          : 'bg-surface border-border text-text-muted hover:border-border-accent hover:text-text-secondary'
                      }`}
                    >
                      <span className="text-base">{booster.icon}</span>
                      {isUsed
                        ? <CheckCircle2 className="h-4 w-4 text-brand-blue shrink-0" />
                        : <Circle className="h-4 w-4 text-text-dim shrink-0" />}
                      <span className="text-xs font-medium">{booster.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || isPending}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-muted hover:bg-card-hover hover:text-text-secondary disabled:opacity-40 transition-all"
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
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20 transition-all"
            >
              Next step →
            </button>
          ) : (
            <button
              type="button"
              onClick={saveSquad}
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isPending ? 'Saving...' : 'Save squad'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
