import { NextResponse } from 'next/server'
import { normalizeCurrentSquadUpdateInput } from '@/lib/current-squad-update'
import { getFantasyPlayersByIds } from '@/lib/queries/fantasy-players'
import { getTransferState, saveTransferState, updateSquadPlayers } from '@/lib/queries/user-squad'
import { validateSquad } from '@/lib/squad-validator'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = normalizeCurrentSquadUpdateInput(await request.json())
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const fantasyPlayers = await getFantasyPlayersByIds(payload.players.map((player) => player.player_id))
  if (fantasyPlayers.length !== payload.players.length) {
    return NextResponse.json({ error: 'One or more selected players were not found.' }, { status: 400 })
  }

  const mergedSquad = payload.players.map((selection) => {
    const player = fantasyPlayers.find((candidate) => candidate.player_id === selection.player_id)

    return {
      player_id: selection.player_id,
      name: player?.name ?? 'Unknown player',
      fantasy_role: player?.fantasy_role ?? null,
      current_team_id: player?.current_team_id ?? null,
      credit_value: player?.credit_value ?? 8,
      is_overseas: player?.is_overseas ?? null,
      is_captain: selection.is_captain,
      is_vice_captain: selection.is_vice_captain,
    }
  })

  const validation = validateSquad(mergedSquad)
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.issues[0]?.message ?? 'Invalid updated squad.', issues: validation.issues },
      { status: 400 }
    )
  }

  const transferState = await getTransferState(user.id)
  await updateSquadPlayers(user.id, payload.players)
  await saveTransferState(user.id, {
    transfers_used: payload.transfersUsed,
    total_points: payload.totalPoints,
    boosters_used: transferState.boosters_used,
  })

  return NextResponse.json({ ok: true })
}
