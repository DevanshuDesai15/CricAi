import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { FantasyRole, FantasySquadPlayer } from '@/lib/fantasy'

export interface UserSquadPlayer extends FantasySquadPlayer {
  country: string | null
  credit_value: number
}

export interface UserSquadFull {
  id: number
  name: string
  players: UserSquadPlayer[]
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

// ── Internal row types ────────────────────────────────────────────────────

interface PlayerRow {
  player_id: string
  name: string
  fantasy_role: FantasyRole | null
  current_team_id: string | null
  credit_value: number | string | null
  is_overseas: boolean | null
  country: string | null
}

interface UserSquadPlayerRow {
  is_captain: boolean | null
  is_vice_captain: boolean | null
  players: PlayerRow | PlayerRow[] | null
}

interface UserSquadRow {
  id: number
  name: string
  user_squad_players: UserSquadPlayerRow[] | null
}

// ── Queries ───────────────────────────────────────────────────────────────

export async function getUserSquad(userId: string): Promise<UserSquadFull | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('user_squads')
    .select(`
      id,
      name,
      user_squad_players(
        is_captain,
        is_vice_captain,
        players(player_id, name, fantasy_role, current_team_id, credit_value, is_overseas, country)
      )
    `)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapUserSquadRow(data as unknown as UserSquadRow)
}

export function mapUserSquadRow(row: UserSquadRow): UserSquadFull {
  const players: UserSquadPlayer[] = (row.user_squad_players ?? [])
    .flatMap((squadPlayer) => {
      const player = getJoinedPlayer(squadPlayer.players)
      if (!player) return []

      return [{
        player_id: player.player_id,
        name: player.name,
        fantasy_role: player.fantasy_role,
        current_team_id: player.current_team_id,
        credit_value: Number(player.credit_value ?? 8),
        is_overseas: player.is_overseas,
        country: player.country,
        is_captain: Boolean(squadPlayer.is_captain),
        is_vice_captain: Boolean(squadPlayer.is_vice_captain),
      }]
    })

  return { id: row.id, name: row.name, players }
}

function getJoinedPlayer(players: PlayerRow | PlayerRow[] | null): PlayerRow | null {
  if (Array.isArray(players)) return players[0] ?? null
  return players
}

// ── Mutations ─────────────────────────────────────────────────────────────

/**
 * Creates or renames the squad and replaces all players.
 * Called from /api/setup-squad on first save.
 */
export async function saveUserSquad(
  userId: string,
  squadName: string,
  players: UserSquadSaveInput[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: squadRow, error: squadError } = await supabase
    .from('user_squads')
    .upsert(
      { user_id: userId, name: squadName, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single()

  if (squadError) throw squadError

  const squadId = squadRow.id

  const { error: deleteError } = await supabase
    .from('user_squad_players')
    .delete()
    .eq('squad_id', squadId)

  if (deleteError) throw deleteError

  if (players.length === 0) return

  const { error: insertError } = await supabase
    .from('user_squad_players')
    .insert(
      players.map((player) => ({
        squad_id: squadId,
        player_id: player.player_id,
        is_captain: player.is_captain,
        is_vice_captain: player.is_vice_captain,
      }))
    )

  if (insertError) throw insertError
}

/**
 * Updates only the player rows for an existing squad.
 * Called from /api/confirm-transfers — preserves the squad name.
 */
export async function updateSquadPlayers(
  userId: string,
  players: UserSquadSaveInput[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: squadRow, error: lookupError } = await supabase
    .from('user_squads')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (lookupError) throw lookupError

  const squadId = squadRow.id

  const { error: deleteError } = await supabase
    .from('user_squad_players')
    .delete()
    .eq('squad_id', squadId)

  if (deleteError) throw deleteError

  if (players.length === 0) return

  const { error: insertError } = await supabase
    .from('user_squad_players')
    .insert(
      players.map((player) => ({
        squad_id: squadId,
        player_id: player.player_id,
        is_captain: player.is_captain,
        is_vice_captain: player.is_vice_captain,
      }))
    )

  if (insertError) throw insertError
}

export async function updateUserSquadName(userId: string, squadName: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('user_squads')
    .update({ name: squadName, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw error
}

// ── Transfer state ────────────────────────────────────────────────────────

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

  const { data: squadRow } = await supabase
    .from('user_squads')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (squadRow) {
    await supabase.from('user_squad_players').delete().eq('squad_id', squadRow.id)
    await supabase.from('user_squads').delete().eq('id', squadRow.id)
  }

  await supabase.from('user_transfer_state').delete().eq('user_id', userId)
}
