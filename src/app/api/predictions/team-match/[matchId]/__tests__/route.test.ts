jest.mock('@/lib/predictions', () => ({
  getPythonErrorMessage: jest.fn(() => 'prediction failed'),
  getTeamMatchPrediction: jest.fn(),
}))

jest.mock('@/lib/queries/matches', () => ({
  getIPLStandings: jest.fn(),
  getUpcomingMatch: jest.fn(),
  listRecentMatches: jest.fn(),
}))

jest.mock('@/lib/team-prediction-audits', () => ({
  recordTeamMatchPredictionAudit: jest.fn(),
}))

import { GET } from '../route'
import { getTeamMatchPrediction } from '@/lib/predictions'
import { getIPLStandings, getUpcomingMatch, listRecentMatches } from '@/lib/queries/matches'
import { recordTeamMatchPredictionAudit } from '@/lib/team-prediction-audits'

const getTeamMatchPredictionMock = getTeamMatchPrediction as jest.Mock
const getUpcomingMatchMock = getUpcomingMatch as jest.Mock
const getIPLStandingsMock = getIPLStandings as jest.Mock
const listRecentMatchesMock = listRecentMatches as jest.Mock
const recordTeamMatchPredictionAuditMock = recordTeamMatchPredictionAudit as jest.Mock

describe('team match prediction route', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns a model-backed next match forecast and records an audit', async () => {
    const match = {
      match_id: 'next-match',
      match_date: '2026-05-06',
      team1_id: 'sunrisers_hyderabad',
      team2_id: 'punjab_kings',
      winner: null,
      venue_id: null,
      season: '2026',
    }
    const modelPrediction = {
      match_id: 'next-match',
      model_version: 'team-match-gradient-boosting-v1',
      generated_at: '2026-05-05T12:00:00.000Z',
      team1_id: 'sunrisers_hyderabad',
      team2_id: 'punjab_kings',
      team1_probability: 57,
      team2_probability: 43,
      favorite_team_id: 'sunrisers_hyderabad',
      confidence: 57,
      source: 'team_match_classifier',
    }

    getUpcomingMatchMock.mockResolvedValue(match)
    getIPLStandingsMock.mockResolvedValue([
      { team_id: 'sunrisers_hyderabad', wins: 3, losses: 2, played: 5 },
      { team_id: 'punjab_kings', wins: 2, losses: 3, played: 5 },
    ])
    listRecentMatchesMock.mockResolvedValue([])
    getTeamMatchPredictionMock.mockResolvedValue(modelPrediction)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ matchId: 'next-match' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.forecast).toMatchObject({
      match_id: 'next-match',
      team1_probability: 57,
      team2_probability: 43,
      favorite_team_id: 'sunrisers_hyderabad',
    })
    expect(getIPLStandingsMock).toHaveBeenCalledWith('2026')
    expect(getTeamMatchPredictionMock).toHaveBeenCalledWith('next-match')
    expect(recordTeamMatchPredictionAuditMock).toHaveBeenCalledWith(match, body.forecast, {
      modelVersion: 'team-match-gradient-boosting-v1',
      predictionSource: 'team_match_classifier',
      generatedAt: '2026-05-05T12:00:00.000Z',
    })
  })

  it('logs audit storage failures without failing the prediction response', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const match = {
      match_id: 'next-match',
      match_date: '2026-05-06',
      team1_id: 'sunrisers_hyderabad',
      team2_id: 'punjab_kings',
      winner: null,
      venue_id: null,
      season: '2026',
    }
    const modelPrediction = {
      match_id: 'next-match',
      model_version: 'team-match-gradient-boosting-v1',
      generated_at: '2026-05-05T12:00:00.000Z',
      team1_id: 'sunrisers_hyderabad',
      team2_id: 'punjab_kings',
      team1_probability: 57,
      team2_probability: 43,
      favorite_team_id: 'sunrisers_hyderabad',
      confidence: 57,
      source: 'team_match_classifier',
    }
    const auditError = new Error('audit insert failed')

    getUpcomingMatchMock.mockResolvedValue(match)
    getIPLStandingsMock.mockResolvedValue([])
    listRecentMatchesMock.mockResolvedValue([])
    getTeamMatchPredictionMock.mockResolvedValue(modelPrediction)
    recordTeamMatchPredictionAuditMock.mockRejectedValue(auditError)

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ matchId: 'next-match' }),
    })

    expect(response.status).toBe(200)
    expect(warn).toHaveBeenCalledWith(
      '[team-match-prediction] failed to record audit',
      'next-match',
      auditError
    )

    warn.mockRestore()
  })
})
