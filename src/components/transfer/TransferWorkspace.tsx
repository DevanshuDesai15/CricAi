'use client'

import { useState } from 'react'
import type { UpcomingMatch } from '@/lib/queries/matches'
import type { FantasyPlayerSearchResult } from '@/lib/queries/fantasy-players'
import type { UserSquadPlayer } from '@/lib/queries/user-squad'
import { FixturesStrip } from '@/components/transfer/FixturesStrip'
import { PitchFormation } from '@/components/transfer/PitchFormation'
import { RecommendationsPanel } from '@/components/transfer/RecommendationsPanel'
import { EditCurrentSquadCard } from '@/components/transfer/EditCurrentSquadCard'

interface TransferWorkspaceProps {
  squadName: string
  initialSquad: UserSquadPlayer[]
  initialTransfersUsed: number
  initialTotalPoints: number
  fixtures: UpcomingMatch[]
  availablePlayers: FantasyPlayerSearchResult[]
}

export function TransferWorkspace({
  squadName,
  initialSquad,
  initialTransfersUsed,
  initialTotalPoints,
  fixtures,
  availablePlayers,
}: TransferWorkspaceProps) {
  const [workingSquad, setWorkingSquad] = useState<UserSquadPlayer[]>(initialSquad)
  const [transfersUsed, setTransfersUsed] = useState(initialTransfersUsed)
  const [totalPoints, setTotalPoints] = useState(initialTotalPoints)

  const transfersRemaining = Math.max(0, 160 - transfersUsed)

  return (
    <div className="space-y-6">
      {/* Squad summary bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-5 py-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-blue" />
            <span className="text-text-secondary">
              <span className="font-semibold text-text-primary">{initialSquad.length}</span> / 11 players
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-green" />
            <span className="text-text-secondary">
              <span className="font-semibold text-text-primary">{transfersRemaining}</span> transfers left
            </span>
          </div>
        </div>
        <span className="text-xs text-text-muted italic font-medium">{squadName}</span>
      </div>

      {/* Fixtures */}
      <FixturesStrip fixtures={fixtures} />

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px] items-start">
        <PitchFormation players={workingSquad} />
        <div className="space-y-6">
          <EditCurrentSquadCard
            squadName={squadName}
            initialSquad={initialSquad}
            availablePlayers={availablePlayers}
            transfersUsed={initialTransfersUsed}
            totalPoints={totalPoints}
          />
          <RecommendationsPanel
            initialSquad={initialSquad}
            initialTransfersUsed={initialTransfersUsed}
            onPendingSquadChange={setWorkingSquad}
          />
        </div>
      </div>
    </div>
  )
}
