import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { TeamStanding } from '@/lib/queries/matches'

export function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-center">Played</TableHead>
          <TableHead className="text-center">Won</TableHead>
          <TableHead className="text-center">Lost</TableHead>
          <TableHead className="text-center">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((team, i) => (
          <TableRow key={team.team_id}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="font-medium uppercase">
              {team.team_id.replace(/_/g, ' ')}
            </TableCell>
            <TableCell className="text-center">{team.played}</TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="text-green-600">{team.wins}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="text-red-500">{team.losses}</Badge>
            </TableCell>
            <TableCell className="text-center font-bold">{team.wins * 2}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
