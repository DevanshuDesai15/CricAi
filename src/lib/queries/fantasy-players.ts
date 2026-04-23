import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { FantasyPlayerCore } from '@/lib/fantasy'

export interface FantasyPlayerSearchResult extends FantasyPlayerCore {
  country: string | null
  credit_value: number | null
}

export async function listFantasyPlayers(search?: string): Promise<FantasyPlayerSearchResult[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('players')
    .select('player_id, name, fantasy_role, current_team_id, is_overseas, country, credit_value')
    .not('fantasy_role', 'is', null)
    .order('name')
    .limit(200)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getFantasyPlayersByIds(playerIds: string[]): Promise<FantasyPlayerSearchResult[]> {
  if (playerIds.length === 0) return []

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('players')
    .select('player_id, name, fantasy_role, current_team_id, is_overseas, country, credit_value')
    .in('player_id', playerIds)

  if (error) throw error
  return data ?? []
}
