import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { FantasyRole, FantasySquadPlayer } from '@/lib/fantasy'

export interface UserSquadPlayer extends FantasySquadPlayer {
  country: string | null
  credit_value: number
}

export interface UserSquadSaveInput {
  player_id: string
  is_captain: boolean
  is_vice_captain: boolean
}

export interface TransferState {
  transfers_used: number
  boosters_used: string[]
}

interface UserSquadRow {
  is_captain: boolean | null
  is_vice_captain: boolean | null
  players: Array<{
    player_id: string
    name: string
    fantasy_role: FantasyRole | null
    current_team_id: string | null
    credit_value: number | string | null
    is_overseas: boolean | null
    country: string | null
  }> | null
}

export async function getUserSquad(userId: string): Promise<UserSquadPlayer[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_squads')
    .select(`
      is_captain,
      is_vice_captain,
      players!inner(
        player_id,
        name,
        fantasy_role,
        current_team_id,
        credit_value,
        is_overseas,
        country
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  return ((data ?? []) as UserSquadRow[])
    .filter((row) => row.players?.[0] !== undefined)
    .map((row) => ({
      player_id: row.players![0].player_id,
      name: row.players![0].name,
      fantasy_role: row.players![0].fantasy_role,
      current_team_id: row.players![0].current_team_id,
      credit_value: Number(row.players![0].credit_value ?? 8),
      is_overseas: row.players![0].is_overseas,
      country: row.players![0].country,
      is_captain: Boolean(row.is_captain),
      is_vice_captain: Boolean(row.is_vice_captain),
    }))
}

export async function saveUserSquad(userId: string, players: UserSquadSaveInput[]): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error: deleteError } = await supabase
    .from('user_squads')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  if (players.length === 0) return

  const { error: insertError } = await supabase
    .from('user_squads')
    .insert(
      players.map((player) => ({
        user_id: userId,
        player_id: player.player_id,
        is_captain: player.is_captain,
        is_vice_captain: player.is_vice_captain,
      }))
    )

  if (insertError) throw insertError
}

export async function getTransferState(userId: string): Promise<TransferState> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_transfer_state')
    .select('transfers_used, boosters_used')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  return {
    transfers_used: data?.transfers_used ?? 0,
    boosters_used: Array.isArray(data?.boosters_used)
      ? data.boosters_used.filter((value): value is string => typeof value === 'string')
      : [],
  }
}

export async function saveTransferState(userId: string, state: TransferState): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('user_transfer_state')
    .upsert(
      {
        user_id: userId,
        transfers_used: state.transfers_used,
        boosters_used: state.boosters_used,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) throw error
}

export async function resetUserSquad(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error: squadError } = await supabase.from('user_squads').delete().eq('user_id', userId)
  if (squadError) throw squadError

  const { error: transferError } = await supabase.from('user_transfer_state').delete().eq('user_id', userId)
  if (transferError) throw transferError
}
