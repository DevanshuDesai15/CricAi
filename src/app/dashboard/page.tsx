import { getIPLStandings, listRecentMatches } from '@/lib/queries/matches'
import { StandingsTable } from '@/components/StandingsTable'

export default async function DashboardPage() {
  const [standings, recentMatches] = await Promise.all([
    getIPLStandings('2025'),
    listRecentMatches('ipl', 10),
  ])

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">IPL 2025 Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Points Table</h2>
        {standings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No IPL 2025 data yet. Run the ingestion scripts to populate.
          </p>
        ) : (
          <StandingsTable standings={standings} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Matches</h2>
        <div className="space-y-2">
          {recentMatches.map(m => (
            <div key={m.match_id} className="flex justify-between items-center p-3 border rounded-lg text-sm">
              <span className="font-medium uppercase">
                {m.team1_id?.replace(/_/g, ' ')} vs {m.team2_id?.replace(/_/g, ' ')}
              </span>
              <span className="text-muted-foreground">{m.match_date}</span>
              {m.winner && (
                <span className="text-green-600 font-medium uppercase">
                  {m.winner.replace(/_/g, ' ')} won
                </span>
              )}
            </div>
          ))}
          {recentMatches.length === 0 && (
            <p className="text-muted-foreground text-sm">No matches yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
