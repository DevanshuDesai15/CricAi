import { NextResponse } from 'next/server'
import { getPythonErrorMessage, getTeamMatchPrediction } from '@/lib/predictions'
import { getIPLStandings, getUpcomingMatch, listRecentMatches } from '@/lib/queries/matches'
import { recordTeamMatchPredictionAudit } from '@/lib/team-prediction-audits'
import { getNextMatchWinProbability } from '@/lib/team-forecasts'

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params

  try {
    const match = await getUpcomingMatch(matchId)

    if (!match) {
      return NextResponse.json(
        {
          error: 'match_not_found',
          message: `Upcoming match not found: ${matchId}`,
        },
        { status: 404 }
      )
    }

    const [standings, recentMatches, modelPrediction] = await Promise.all([
      getIPLStandings(match.season),
      listRecentMatches('ipl', 12),
      getTeamMatchPrediction(match.match_id),
    ])
    const currentSeasonMatches = recentMatches.filter(recentMatch => recentMatch.season === match.season)
    const forecast = getNextMatchWinProbability(
      match,
      currentSeasonMatches,
      standings,
      modelPrediction
    )

    try {
      await recordTeamMatchPredictionAudit(match, forecast, {
        modelVersion: modelPrediction.model_version,
        predictionSource: modelPrediction.source,
        generatedAt: modelPrediction.generated_at,
      })
    } catch {}

    return NextResponse.json({
      prediction: modelPrediction,
      forecast,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'prediction_failed',
        message: getPythonErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
