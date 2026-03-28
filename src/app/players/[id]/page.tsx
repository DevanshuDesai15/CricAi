import { notFound } from 'next/navigation'
import { getPlayer, getPlayerRecentStats } from '@/lib/queries/players'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const playerId = decodeURIComponent(id)
  const [player, recentStats] = await Promise.all([
    getPlayer(playerId),
    getPlayerRecentStats(playerId, 10),
  ])

  if (!player) notFound()

  const avgFantasyPoints = recentStats.length > 0
    ? (recentStats.reduce((s, r) => s + r.fantasy_points, 0) / recentStats.length).toFixed(1)
    : 'N/A'

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          {player.primary_role && <Badge>{player.primary_role}</Badge>}
          {player.nationality && <Badge variant="outline">{player.nationality}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {player.batting_style && (
          <div><span className="text-muted-foreground">Batting: </span>{player.batting_style}</div>
        )}
        {player.bowling_style && (
          <div><span className="text-muted-foreground">Bowling: </span>{player.bowling_style}</div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Form — Avg Fantasy Points: {avgFantasyPoints}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent match data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Runs</th>
                  <th className="pb-2 text-right">Wkts</th>
                  <th className="pb-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {recentStats.map(s => (
                  <tr key={s.match_id} className="border-b last:border-0">
                    <td className="py-1">{s.match_date}</td>
                    <td className="py-1 text-right">{s.runs}</td>
                    <td className="py-1 text-right">{s.wickets}</td>
                    <td className="py-1 text-right font-medium">{s.fantasy_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
