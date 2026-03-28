import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface PlayerSummary {
  player_id: string
  name: string
  nationality: string | null
  primary_role: string | null
}

export interface PlayerProfile extends PlayerSummary {
  batting_style: string | null
  bowling_style: string | null
  leagues_played: string[]
}

export interface PlayerMatchStat {
  match_id: string
  match_date: string
  runs: number
  balls_faced: number
  wickets: number
  fantasy_points: number
  team_id: string | null
}

export async function listPlayers(search?: string): Promise<PlayerSummary[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('players')
    .select('player_id, name, nationality, primary_role')
    .order('name')
    .limit(100)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPlayer(playerId: string): Promise<PlayerProfile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('players')
    .select('player_id, name, nationality, primary_role, batting_style, bowling_style, leagues_played')
    .eq('player_id', playerId)
    .single()

  if (error) return null
  return data
}

export async function getPlayerRecentStats(playerId: string, limit = 10): Promise<PlayerMatchStat[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('player_match_stats')
    .select(`
      match_id,
      runs,
      balls_faced,
      wickets,
      fantasy_points,
      team_id,
      matches!inner(match_date)
    `)
    .eq('player_id', playerId)
    .order('matches(match_date)', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    match_id:       row.match_id,
    match_date:     row.matches?.match_date ?? '',
    runs:           row.runs ?? 0,
    balls_faced:    row.balls_faced ?? 0,
    wickets:        row.wickets ?? 0,
    fantasy_points: row.fantasy_points ?? 0,
    team_id:        row.team_id,
  }))
}
