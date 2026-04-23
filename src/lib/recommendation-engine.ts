import type { FantasyRole } from '@/lib/fantasy'
import { validateSquad } from '@/lib/squad-validator'

export interface PlayerWithPrediction {
  player_id: string
  name: string
  fantasy_role: FantasyRole | null
  current_team_id: string | null
  credit_value: number
  is_overseas: boolean | null
  predicted_points: number
  is_captain?: boolean
  is_vice_captain?: boolean
}

export interface SwapSuggestion {
  player_out: PlayerWithPrediction
  player_in: PlayerWithPrediction
  points_delta: number
  credit_delta: number
}

export interface RecommendationResult {
  swaps: SwapSuggestion[]
  captain_suggestion: PlayerWithPrediction | null
  vc_suggestion: PlayerWithPrediction | null
}

const TRANSFER_COST_PENALTY = 5

export function generateRecommendations(
  currentSquad: PlayerWithPrediction[],
  allPlayers: PlayerWithPrediction[],
  transfersRemaining: number,
  maxSuggestions = 5
): RecommendationResult {
  if (transfersRemaining <= 0) {
    return {
      swaps: [],
      captain_suggestion: getCaptainSuggestion(currentSquad),
      vc_suggestion: getViceCaptainSuggestion(currentSquad),
    }
  }

  const squadIds = new Set(currentSquad.map((player) => player.player_id))
  const pool = allPlayers.filter((player) => !squadIds.has(player.player_id))
  const swapCandidates: Array<SwapSuggestion & { score: number }> = []

  for (const outgoing of currentSquad) {
    const incomingCandidates = pool.filter((candidate) => candidate.fantasy_role === outgoing.fantasy_role)

    for (const incoming of incomingCandidates) {
      const nextSquad = currentSquad.map((player) => {
        if (player.player_id !== outgoing.player_id) return player

        return {
          ...incoming,
          is_captain: player.is_captain,
          is_vice_captain: player.is_vice_captain,
        }
      })

      const validation = validateSquad(nextSquad)
      if (!validation.isValid) continue

      const pointsDelta = incoming.predicted_points - outgoing.predicted_points
      const score = pointsDelta - TRANSFER_COST_PENALTY
      if (score <= 0) continue

      swapCandidates.push({
        player_out: outgoing,
        player_in: incoming,
        points_delta: pointsDelta,
        credit_delta: incoming.credit_value - outgoing.credit_value,
        score,
      })
    }
  }

  swapCandidates.sort((left, right) => right.score - left.score)

  const seenOutgoingPlayers = new Set<string>()
  const swaps = swapCandidates
    .filter((swap) => {
      if (seenOutgoingPlayers.has(swap.player_out.player_id)) return false
      seenOutgoingPlayers.add(swap.player_out.player_id)
      return true
    })
    .slice(0, maxSuggestions)
    .map((swap) => ({
      player_out: swap.player_out,
      player_in: swap.player_in,
      points_delta: swap.points_delta,
      credit_delta: swap.credit_delta,
    }))

  return {
    swaps,
    captain_suggestion: getCaptainSuggestion(currentSquad),
    vc_suggestion: getViceCaptainSuggestion(currentSquad),
  }
}

function getCaptainSuggestion(players: PlayerWithPrediction[]): PlayerWithPrediction | null {
  return [...players].sort((left, right) => right.predicted_points - left.predicted_points)[0] ?? null
}

function getViceCaptainSuggestion(players: PlayerWithPrediction[]): PlayerWithPrediction | null {
  return [...players].sort((left, right) => right.predicted_points - left.predicted_points)[1] ?? null
}
