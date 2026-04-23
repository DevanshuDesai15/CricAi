import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupDrawer } from '@/components/transfer/SetupDrawer'
import { TransferWorkspace } from '@/components/transfer/TransferWorkspace'
import { listFantasyPlayers } from '@/lib/queries/fantasy-players'
import { listUpcomingMatches } from '@/lib/queries/matches'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getTransferState, getUserSquad } from '@/lib/queries/user-squad'

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/team')
  }

  const [squad, transferState, availablePlayers, fixtures] = await Promise.all([
    getUserSquad(user.id),
    getTransferState(user.id),
    listFantasyPlayers(),
    listUpcomingMatches('ipl', 3),
  ])

  const transfersRemaining = Math.max(0, 160 - transferState.transfers_used)
  const overseasCount = squad.filter((player) => player.is_overseas).length
  const totalCredits = squad.reduce((sum, player) => sum + player.credit_value, 0)

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-blue font-semibold">
          Transfer Assistant
        </p>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Auth, squad storage, and fantasy-schema access are now in place. Setup and recommendation flows
          will build on this page next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Players Saved" value={`${squad.length} / 11`} detail="Current user squad rows" />
        <StatusCard title="Transfers Left" value={`${transfersRemaining} / 160`} detail="Derived from transfer state" />
        <StatusCard title="Credits Used" value={totalCredits.toFixed(1)} detail={`${overseasCount} overseas players`} />
      </div>

      {squad.length === 0 ? (
        <SetupDrawer availablePlayers={availablePlayers} />
      ) : (
        <>
          <TransferWorkspace
            initialSquad={squad}
            initialTransfersUsed={transferState.transfers_used}
            fixtures={fixtures}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Squad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {squad.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.fantasy_role ?? 'Role missing'}
                        {player.country ? ` · ${player.country}` : ''}
                        {player.is_overseas ? ' · Overseas' : ''}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{player.credit_value.toFixed(1)} cr</div>
                      <div>
                        {player.is_captain ? 'Captain' : player.is_vice_captain ? 'Vice-Captain' : 'Squad'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

function StatusCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
