import {
  buildTeamMatchPredictionAuditRow,
  recordTeamMatchPredictionAudit,
  resolveTeamMatchPredictionAuditRow,
} from '@/lib/team-prediction-audits'
import type { UpcomingMatch } from '@/lib/queries/matches'
import type { NextMatchWinProbability } from '@/lib/team-forecasts'

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceRoleClient: jest.fn(),
}))

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'

const createSupabaseServiceRoleClientMock = createSupabaseServiceRoleClient as jest.Mock

const match: UpcomingMatch = {
  match_id: 'match-1',
  match_date: '2026-05-06',
  team1_id: 'sunrisers_hyderabad',
  team2_id: 'punjab_kings',
  winner: null,
  venue_id: null,
  season: '2026',
}

const forecast: NextMatchWinProbability = {
  match_id: 'match-1',
  match_date: '2026-05-06',
  venue_id: null,
  team1_id: 'sunrisers_hyderabad',
  team2_id: 'punjab_kings',
  team1_probability: 57,
  team2_probability: 43,
  favorite_team_id: 'sunrisers_hyderabad',
  confidence: 57,
  factors: [{ label: 'Model', value: 'team-match-gradient-boosting-v1' }],
}

describe('buildTeamMatchPredictionAuditRow', () => {
  it('maps a pre-match forecast to an idempotent Supabase row', () => {
    const row = buildTeamMatchPredictionAuditRow(match, forecast, {
      modelVersion: 'team-match-gradient-boosting-v1',
      predictionSource: 'team_match_classifier',
      generatedAt: '2026-05-05T12:00:00.000Z',
    })

    expect(row).toEqual({
      match_id: 'match-1',
      model_version: 'team-match-gradient-boosting-v1',
      team1_id: 'sunrisers_hyderabad',
      team2_id: 'punjab_kings',
      team1_probability: 57,
      team2_probability: 43,
      favorite_team_id: 'sunrisers_hyderabad',
      confidence: 57,
      prediction_source: 'team_match_classifier',
      generated_at: '2026-05-05T12:00:00.000Z',
      updated_at: '2026-05-05T12:00:00.000Z',
    })
  })

  it('does not build an audit row for completed matches', () => {
    expect(buildTeamMatchPredictionAuditRow(
      { ...match, winner: 'punjab_kings' },
      forecast,
      {
        modelVersion: 'team-match-gradient-boosting-v1',
        predictionSource: 'team_match_classifier',
        generatedAt: '2026-05-05T12:00:00.000Z',
      }
    )).toBeNull()
  })
})

describe('resolveTeamMatchPredictionAuditRow', () => {
  it('scores an unresolved prediction against the actual winner', () => {
    const resolved = resolveTeamMatchPredictionAuditRow(
      { id: 10, favorite_team_id: 'sunrisers_hyderabad' },
      'punjab_kings',
      '2026-05-07T01:00:00.000Z'
    )

    expect(resolved).toEqual({
      id: 10,
      actual_winner: 'punjab_kings',
      was_correct: false,
      resolved_at: '2026-05-07T01:00:00.000Z',
      updated_at: '2026-05-07T01:00:00.000Z',
    })
  })
})

describe('recordTeamMatchPredictionAudit', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('stores forecast snapshots through the service-role client', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn().mockReturnValue({ upsert })
    createSupabaseServiceRoleClientMock.mockReturnValue({ from })

    await recordTeamMatchPredictionAudit(match, forecast, {
      modelVersion: 'team-match-gradient-boosting-v1',
      predictionSource: 'team_match_classifier',
      generatedAt: '2026-05-05T12:00:00.000Z',
    })

    expect(createSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('team_match_prediction_audits')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        match_id: 'match-1',
        model_version: 'team-match-gradient-boosting-v1',
        favorite_team_id: 'sunrisers_hyderabad',
      }),
      { onConflict: 'match_id,model_version,prediction_source' }
    )
  })
})
