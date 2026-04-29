import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getFantasyPlayersByIds } from '@/lib/queries/fantasy-players'
import { getTransferState, saveTransferState, updateSquadPlayers } from '@/lib/queries/user-squad'
import { validateSquad } from '@/lib/squad-validator'

interface ConfirmTransfersBody {
  players: Array<{
    player_id: string
    is_captain: boolean
    is_vice_captain: boolean
  }>
  transfersApplied: number
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { players, transfersApplied } = await request.json() as ConfirmTransfersBody

  if (!Array.isArray(players) || !Number.isFinite(transfersApplied)) {
    return NextResponse.json({ error: 'Invalid transfer confirmation payload.' }, { status: 400 })
  }

  const fantasyPlayers = await getFantasyPlayersByIds(players.map((player) => player.player_id))
  if (fantasyPlayers.length !== players.length) {
    return NextResponse.json({ error: 'One or more transferred players were not found.' }, { status: 400 })
  }

  const validatedSquad = players.map((selection) => {
    const player = fantasyPlayers.find((candidate) => candidate.player_id === selection.player_id)

    return {
      player_id: selection.player_id,
      name: player?.name ?? 'Unknown player',
      fantasy_role: player?.fantasy_role ?? null,
      current_team_id: player?.current_team_id ?? null,
      credit_value: player?.credit_value ?? 8,
      is_overseas: player?.is_overseas ?? null,
      is_captain: Boolean(selection.is_captain),
      is_vice_captain: Boolean(selection.is_vice_captain),
    }
  })

  const validation = validateSquad(validatedSquad)
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.issues[0]?.message ?? 'Invalid updated squad.' }, { status: 400 })
  }

  const transferState = await getTransferState(user.id)
  await updateSquadPlayers(user.id, players)
  await saveTransferState(user.id, {
    transfers_used: Math.min(160, transferState.transfers_used + Math.max(0, Math.trunc(transfersApplied))),
    boosters_used: transferState.boosters_used,
  })

  return NextResponse.json({ ok: true })
}
