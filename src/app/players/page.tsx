import { listPlayers } from '@/lib/queries/players'
import { PlayerCard } from '@/components/PlayerCard'
import { Input } from '@/components/ui/input'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const players = await listPlayers(q)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Players</h1>
      <form>
        <Input
          name="q"
          placeholder="Search players..."
          defaultValue={q ?? ''}
          className="max-w-sm"
        />
      </form>
      {players.length === 0 ? (
        <p className="text-muted-foreground text-sm">No players found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {players.map(p => (
            <PlayerCard key={p.player_id} {...p} />
          ))}
        </div>
      )}
    </main>
  )
}
