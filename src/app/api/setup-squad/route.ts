import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getFantasyPlayersByIds } from '@/lib/queries/fantasy-players'
import { saveTransferState, saveUserSquad } from '@/lib/queries/user-squad'
import { validateSquad } from '@/lib/squad-validator'

interface SetupSquadRequestBody {
  squadName: string
  players: Array<{
    player_id: string
    is_captain: boolean
    is_vice_captain: boolean
  }>
  transfersUsed: number
  boostersUsed: string[]
}

export async function POST(request: Request) {
  try {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure a profiles row exists for this user. Users who signed up before the
  // handle_new_user trigger was applied won't have one, which breaks the FK on
  // user_squads.user_id.
  await supabase.from('profiles').upsert(
    { id: user.id, name: user.email ?? '' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { squadName, players, transfersUsed, boostersUsed } = await request.json() as SetupSquadRequestBody

  if (typeof squadName !== 'string' || squadName.trim().length === 0) {
    return NextResponse.json({ error: 'Squad name is required.' }, { status: 400 })
  }

  if (!Array.isArray(players)) {
    return NextResponse.json({ error: 'Invalid squad payload.' }, { status: 400 })
  }

  const playerIds = players.map((player) => player.player_id)
  const fantasyPlayers = await getFantasyPlayersByIds(playerIds)

  if (fantasyPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'One or more selected players were not found.' }, { status: 400 })
  }

  const mergedSquad = players.map((selection) => {
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

  const validation = validateSquad(mergedSquad)
  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: validation.issues[0]?.message ?? 'Squad validation failed.',
        issues: validation.issues,
      },
      { status: 400 }
    )
  }

  await saveUserSquad(user.id, squadName.trim(), players)
  await saveTransferState(user.id, {
    transfers_used: Number.isFinite(transfersUsed) ? Math.max(0, Math.min(160, transfersUsed)) : 0,
    boosters_used: Array.isArray(boostersUsed)
      ? boostersUsed.filter((value): value is string => typeof value === 'string')
      : [],
  })

  return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[setup-squad]', err)
    const message = err instanceof Error ? err.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
