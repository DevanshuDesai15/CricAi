import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface MatchSummary {
  match_id: string
  match_date: string
  team1_id: string | null
  team2_id: string | null
  winner: string | null
  venue_id: string | null
  season: string
}

export interface TeamStanding {
  team_id: string
  wins: number
  losses: number
  played: number
}

export async function listRecentMatches(league = 'ipl', limit = 20): Promise<MatchSummary[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('matches')
    .select('match_id, match_date, team1_id, team2_id, winner, venue_id, season')
    .eq('league_id', league)
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getLatestIPLSeason(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('matches')
    .select('season')
    .eq('league_id', 'ipl')
    .order('match_date', { ascending: false })
    .limit(1)
    .single()
  return data?.season ?? '2025'
}

export async function getIPLStandings(season?: string): Promise<TeamStanding[]> {
  const supabase = await createServerSupabaseClient()
  const resolvedSeason = season ?? await getLatestIPLSeason()

  const { data, error } = await supabase
    .from('matches')
    .select('team1_id, team2_id, winner')
    .eq('league_id', 'ipl')
    .eq('season', resolvedSeason)
    .not('winner', 'is', null)

  if (error) throw error

  const tally: Record<string, TeamStanding> = {}

  for (const m of data ?? []) {
    for (const team of [m.team1_id, m.team2_id]) {
      if (!team) continue
      if (!tally[team]) tally[team] = { team_id: team, wins: 0, losses: 0, played: 0 }
      tally[team].played += 1
    }
    if (m.winner) {
      if (!tally[m.winner]) tally[m.winner] = { team_id: m.winner, wins: 0, losses: 0, played: 0 }
      tally[m.winner].wins += 1
      const loser = m.team1_id === m.winner ? m.team2_id : m.team1_id
      if (loser) {
        if (!tally[loser]) tally[loser] = { team_id: loser, wins: 0, losses: 0, played: 0 }
        tally[loser].losses += 1
      }
    }
  }

  return Object.values(tally).sort((a, b) => b.wins - a.wins)
}
