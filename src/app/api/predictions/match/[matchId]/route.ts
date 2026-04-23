import { NextResponse } from 'next/server'
import { getMatchPredictions, getPythonErrorMessage } from '@/lib/predictions'

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params

  try {
    return NextResponse.json(await getMatchPredictions(matchId))
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
