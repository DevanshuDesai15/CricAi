import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { PlayerSummary } from '@/lib/queries/players'

const ROLE_COLOR: Record<string, string> = {
  BAT:  'bg-blue-100 text-blue-800',
  BOWL: 'bg-green-100 text-green-800',
  AR:   'bg-purple-100 text-purple-800',
  WK:   'bg-yellow-100 text-yellow-800',
}

export function PlayerCard({ player_id, name, primary_role, nationality }: PlayerSummary) {
  return (
    <Link href={`/players/${encodeURIComponent(player_id)}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{name}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {primary_role && (
            <Badge className={ROLE_COLOR[primary_role] ?? 'bg-gray-100 text-gray-800'}>
              {primary_role}
            </Badge>
          )}
          {nationality && (
            <span className="text-sm text-muted-foreground">{nationality}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
