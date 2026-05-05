jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}))

import { execFile } from 'node:child_process'
import { getTeamMatchPrediction, getTransferPredictionScores, resolvePythonExecutable } from '@/lib/predictions'

const execFileMock = execFile as unknown as jest.Mock

describe('resolvePythonExecutable', () => {
  const originalPythonBin = process.env.CRICAI_PYTHON_BIN

  afterEach(() => {
    if (originalPythonBin === undefined) {
      delete process.env.CRICAI_PYTHON_BIN
    } else {
      process.env.CRICAI_PYTHON_BIN = originalPythonBin
    }
  })

  it('uses CRICAI_PYTHON_BIN when configured', () => {
    process.env.CRICAI_PYTHON_BIN = '/custom/python'

    expect(resolvePythonExecutable()).toBe('/custom/python')
  })

  it('defaults to python3', () => {
    delete process.env.CRICAI_PYTHON_BIN

    expect(resolvePythonExecutable()).toBe('python3')
  })
})

describe('getTransferPredictionScores', () => {
  afterEach(() => {
    execFileMock.mockReset()
  })

  it('uses only the next upcoming fixture for transfer recommendations', async () => {
    execFileMock.mockImplementation((_bin, args, _options, callback) => {
      const matchId = args[args.indexOf('--match-id') + 1]
      const predictions = matchId === 'next-match'
        ? [{ rank: 1, player_id: 'pbks-player', player_name: 'PBKS Player', team_id: 'punjab_kings', predicted_fantasy_points: 80 }]
        : [{ rank: 1, player_id: 'srh-player', player_name: 'SRH Player', team_id: 'sunrisers_hyderabad', predicted_fantasy_points: 120 }]

      callback(null, {
        stdout: JSON.stringify({
          match_id: matchId,
          model_version: 'test',
          generated_at: '2026-04-28T00:00:00.000Z',
          predictions,
        }),
      })
    })

    const result = await getTransferPredictionScores([
      {
        match_id: 'next-match',
        match_date: '2026-04-28',
        team1_id: 'punjab_kings',
        team2_id: 'rajasthan_royals',
        winner: null,
        venue_id: null,
        season: '2026',
      },
      {
        match_id: 'later-match',
        match_date: '2026-04-29',
        team1_id: 'mumbai_indians',
        team2_id: 'sunrisers_hyderabad',
        winner: null,
        venue_id: null,
        season: '2026',
      },
    ])

    expect(result.fixtures_considered).toEqual(['next-match'])
    expect(result.scores.get('pbks-player')).toBe(80)
    expect(result.scores.has('srh-player')).toBe(false)
  })
})

describe('getTeamMatchPrediction', () => {
  afterEach(() => {
    execFileMock.mockReset()
  })

  it('calls the team match python module and parses probability payloads', async () => {
    execFileMock.mockImplementation((_bin, args, _options, callback) => {
      expect(args).toEqual(['-m', 'ml.team_predict', '--match-id', 'next-match', '--format', 'json'])

      callback(null, {
        stdout: JSON.stringify({
          match_id: 'next-match',
          model_version: 'team-match-random-forest-v1',
          generated_at: '2026-05-05T00:00:00.000Z',
          team1_id: 'mumbai_indians',
          team2_id: 'chennai_super_kings',
          team1_probability: 61,
          team2_probability: 39,
          favorite_team_id: 'mumbai_indians',
          confidence: 61,
          source: 'team_match_classifier',
        }),
      })
    })

    const payload = await getTeamMatchPrediction('next-match')

    expect(payload.team1_probability).toBe(61)
    expect(payload.favorite_team_id).toBe('mumbai_indians')
    expect(payload.source).toBe('team_match_classifier')
  })
})
