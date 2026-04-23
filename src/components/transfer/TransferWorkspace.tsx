'use client'

import { useState } from 'react'
import type { UpcomingMatch } from '@/lib/queries/matches'
import type { UserSquadPlayer } from '@/lib/queries/user-squad'
import { FixturesStrip } from '@/components/transfer/FixturesStrip'
import { PitchFormation } from '@/components/transfer/PitchFormation'
import { RecommendationsPanel } from '@/components/transfer/RecommendationsPanel'

interface TransferWorkspaceProps {
  initialSquad: UserSquadPlayer[]
  initialTransfersUsed: number
  fixtures: UpcomingMatch[]
}

export function TransferWorkspace({
  initialSquad,
  initialTransfersUsed,
  fixtures,
}: TransferWorkspaceProps) {
  const [workingSquad, setWorkingSquad] = useState(initialSquad)

  return (
    <div className="space-y-6">
      <FixturesStrip fixtures={fixtures} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <PitchFormation players={workingSquad} />
        <RecommendationsPanel
          initialSquad={initialSquad}
          initialTransfersUsed={initialTransfersUsed}
          onPendingSquadChange={setWorkingSquad}
        />
      </div>
    </div>
  )
}
