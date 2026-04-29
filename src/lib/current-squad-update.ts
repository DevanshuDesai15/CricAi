import { MAX_TRANSFERS_PER_SEASON } from '@/lib/transfer-setup'

export interface CurrentSquadSelection {
  player_id: string
  is_captain: boolean
  is_vice_captain: boolean
}

export type NormalizedCurrentSquadUpdate =
  | {
      ok: true
      players: CurrentSquadSelection[]
      transfersUsed: number
      totalPoints: number
    }
  | {
      ok: false
      error: string
    }

export function normalizeCurrentSquadUpdateInput(input: {
  players?: unknown
  transfersUsed?: unknown
  totalPoints?: unknown
}): NormalizedCurrentSquadUpdate {
  if (!Array.isArray(input.players)) {
    return { ok: false, error: 'Invalid squad payload.' }
  }

  const players: CurrentSquadSelection[] = []
  for (const player of input.players) {
    if (!isSelectionObject(player) || player.player_id.trim().length === 0) {
      return { ok: false, error: 'Every selected player must have a player id.' }
    }

    players.push({
      player_id: player.player_id.trim(),
      is_captain: Boolean(player.is_captain),
      is_vice_captain: Boolean(player.is_vice_captain),
    })
  }

  const transfersUsed = Number(input.transfersUsed)
  if (!Number.isFinite(transfersUsed)) {
    return { ok: false, error: 'Transfers used must be a number.' }
  }

  const totalPoints = Number(input.totalPoints || 0)
  if (!Number.isFinite(totalPoints)) {
    return { ok: false, error: 'Total points must be a number.' }
  }

  return {
    ok: true,
    players,
    transfersUsed: Math.max(0, Math.min(MAX_TRANSFERS_PER_SEASON, Math.trunc(transfersUsed))),
    totalPoints: Math.max(0, Math.trunc(totalPoints)),
  }
}

function isSelectionObject(value: unknown): value is {
  player_id: string
  is_captain?: unknown
  is_vice_captain?: unknown
} {
  return (
    typeof value === 'object'
    && value !== null
    && 'player_id' in value
    && typeof (value as { player_id?: unknown }).player_id === 'string'
  )
}
