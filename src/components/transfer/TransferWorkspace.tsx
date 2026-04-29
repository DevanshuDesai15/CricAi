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
  fixtures: UpcomingMatch[]
  availablePlayers: FantasyPlayerSearchResult[]
}

export function TransferWorkspace({
  squadName,
  initialSquad,
  initialTransfersUsed,
  fixtures,
  availablePlayers,
}: TransferWorkspaceProps) {
  const [workingSquad, setWorkingSquad] = useState(initialSquad)

  const transfersUsed = initialTransfersUsed
  const transfersRemaining = Math.max(0, 160 - transfersUsed)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{initialSquad.length} / 11 players</span>
          <span>·</span>
          <span>{transfersRemaining} transfers left</span>
        </div>
        <span className="text-xs text-muted-foreground italic">{squadName}</span>
      </div>
      <FixturesStrip fixtures={fixtures} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <PitchFormation players={workingSquad} />
        <div className="space-y-6">
          <EditCurrentSquadCard
            squadName={squadName}
            initialSquad={initialSquad}
            availablePlayers={availablePlayers}
            transfersUsed={initialTransfersUsed}
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
