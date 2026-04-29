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

  const hasSquad = squadData !== null

  return (
    <main className="min-h-screen">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/8 via-transparent to-brand-orange/5" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand-blue/5 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-brand-orange/5 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue-dim border border-brand-blue/20 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-blue">
                  Transfer Assistant
                </span>
              </div>
              <h1 className="text-3xl font-bold font-outfit tracking-tight">
                {hasSquad ? squadData.name : 'My Team'}
              </h1>
              {!hasSquad && (
                <p className="mt-2 text-sm text-text-secondary max-w-md">
                  Build your dream XI, pick your captain, and let our AI engine suggest the smartest transfers.
                </p>
              )}
            </div>

            {hasSquad && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="glass-card rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="text-lg font-bold font-outfit text-brand-blue">
                    {squadData.players.length}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Players</div>
                </div>
                <div className="glass-card rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="text-lg font-bold font-outfit text-brand-green">
                    {Math.max(0, 160 - transferState.transfers_used)}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Transfers</div>
                </div>
                <div className="glass-card rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="text-lg font-bold font-outfit text-brand-orange">
                    {transferState.transfers_used}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Used</div>
                </div>
                <div className="glass-card rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="text-lg font-bold font-outfit text-amber-400">
                    {transferState.total_points}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Total Pts</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {squadData === null ? (
          <SetupDrawer availablePlayers={availablePlayers} />
        ) : (
          <TransferWorkspace
            squadName={squadData.name}
            initialSquad={squadData.players}
            initialTransfersUsed={transferState.transfers_used}
            initialTotalPoints={transferState.total_points}
            fixtures={fixtures}
            availablePlayers={availablePlayers}
          />
        )}
      </div>
    </main>
  )
}
