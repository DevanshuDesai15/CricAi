import { NextResponse } from 'next/server'
import { listUpcomingMatches } from '@/lib/queries/matches'
import { listFantasyPlayers } from '@/lib/queries/fantasy-players'
import { getTransferState, getUserSquad } from '@/lib/queries/user-squad'
import { getTransferPredictionScores } from '@/lib/predictions'
import { generateRecommendations, type PlayerWithPrediction } from '@/lib/recommendation-engine'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [squadData, transferState, allPlayers, upcomingMatches] = await Promise.all([
    getUserSquad(user.id),
    getTransferState(user.id),
    listFantasyPlayers(),
    listUpcomingMatches('ipl', 3),
  ])

  const squad = squadData?.players ?? []

  if (squad.length !== 11) {
    return NextResponse.json({ error: 'Squad incomplete' }, { status: 400 })
  }

  const predictionInput = await getTransferPredictionScores(upcomingMatches)
  const predictionScores = predictionInput.scores

  if (predictionInput.errors.length > 0) {
    console.warn('[transfer-recommendations] prediction failures', predictionInput.errors)
  }

  const squadWithPredictions: PlayerWithPrediction[] = squad.map((player) => ({
    player_id: player.player_id,
    name: player.name,
    fantasy_role: player.fantasy_role,
    current_team_id: player.current_team_id,
    credit_value: player.credit_value,
    is_overseas: player.is_overseas,
    predicted_points: predictionScores.get(player.player_id) ?? 0,
    is_captain: player.is_captain,
    is_vice_captain: player.is_vice_captain,
  }))

  const playersWithPredictions: PlayerWithPrediction[] = allPlayers.map((player) => ({
    player_id: player.player_id,
    name: player.name,
    fantasy_role: player.fantasy_role,
    current_team_id: player.current_team_id,
    credit_value: player.credit_value ?? 8,
    is_overseas: player.is_overseas,
    predicted_points: predictionScores.get(player.player_id) ?? 0,
  }))

  const transfersRemaining = Math.max(0, 160 - transferState.transfers_used)
  const result = predictionScores.size === 0
    ? {
        swaps: [],
        captain_suggestion: null,
        vc_suggestion: null,
      }
    : generateRecommendations(squadWithPredictions, playersWithPredictions, transfersRemaining)

  return NextResponse.json({
    ...result,
    transfers_remaining: transfersRemaining,
    fixtures_considered: predictionInput.fixtures_considered,
    scoring_available: predictionScores.size > 0,
  })
}
