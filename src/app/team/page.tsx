import { redirect } from 'next/navigation'
import { SetupDrawer } from '@/components/transfer/SetupDrawer'
import { TransferWorkspace } from '@/components/transfer/TransferWorkspace'
import { listFantasyPlayers } from '@/lib/queries/fantasy-players'
import { listUpcomingMatches } from '@/lib/queries/matches'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTransferState, getUserSquad } from '@/lib/queries/user-squad'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/team')
  }

  const [squadData, transferState, availablePlayers, fixtures] = await Promise.all([
    getUserSquad(user.id),
    getTransferState(user.id),
    listFantasyPlayers(),
    listUpcomingMatches('ipl', 3),
  ])

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-blue font-semibold">
          Transfer Assistant
        </p>
        <h1 className="text-3xl font-bold">
          {squadData ? squadData.name : 'My Team'}
        </h1>
      </div>

      {squadData === null ? (
        <SetupDrawer availablePlayers={availablePlayers} />
      ) : (
        <TransferWorkspace
          squadName={squadData.name}
          initialSquad={squadData.players}
          initialTransfersUsed={transferState.transfers_used}
          fixtures={fixtures}
          availablePlayers={availablePlayers}
        />
      )}
    </main>
  )
}
