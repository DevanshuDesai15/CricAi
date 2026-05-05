import { NextResponse } from 'next/server'
import { resolveTeamMatchPredictionAudits } from '@/lib/team-prediction-audits'

export async function POST() {
  try {
    const resolved_count = await resolveTeamMatchPredictionAudits()
    return NextResponse.json({ resolved_count })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'prediction_audit_resolve_failed',
        message: error instanceof Error ? error.message : 'Failed to resolve prediction audits',
      },
      { status: 500 }
    )
  }
}
