jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}))

import { execFile } from 'node:child_process'
import {
  clearPredictionCache,
  getMatchPredictions,
  getTeamMatchPrediction,
  getTransferPredictionScores,
  resolvePythonExecutable,
} from '@/lib/predictions'

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
    clearPredictionCache()
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

describe('getMatchPredictions', () => {
  afterEach(() => {
    execFileMock.mockReset()
    clearPredictionCache()
    jest.useRealTimers()
  })

  it('reuses player predictions for the same match and day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-05T12:00:00.000Z'))
    execFileMock.mockImplementation((_bin, args, _options, callback) => {
      expect(args).toEqual(['-m', 'ml.predict', '--match-id', 'next-match', '--format', 'json'])

      callback(null, {
        stdout: JSON.stringify({
          match_id: 'next-match',
          model_version: 'fantasy-points-v1',
          generated_at: '2026-05-05T12:00:00.000Z',
          predictions: [
            {
              rank: 1,
              player_id: 'mi-player',
              player_name: 'MI Player',
              team_id: 'mumbai_indians',
              predicted_fantasy_points: 81,
            },
          ],
        }),
      })
    })

    const first = await getMatchPredictions('next-match')
    const second = await getMatchPredictions('next-match')

    expect(first).toBe(second)
    expect(first.predictions[0].predicted_fantasy_points).toBe(81)
    expect(execFileMock).toHaveBeenCalledTimes(1)
  })
})

describe('getTeamMatchPrediction', () => {
  afterEach(() => {
    execFileMock.mockReset()
    clearPredictionCache()
    jest.useRealTimers()
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

  it('reuses the same team match prediction for the same day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-05T12:00:00.000Z'))
    execFileMock.mockImplementation((_bin, _args, _options, callback) => {
      callback(null, {
        stdout: JSON.stringify({
          match_id: 'next-match',
          model_version: 'team-match-random-forest-v1',
          generated_at: '2026-05-05T12:00:00.000Z',
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

    const first = await getTeamMatchPrediction('next-match')
    const second = await getTeamMatchPrediction('next-match')

    expect(first).toBe(second)
    expect(execFileMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes team match predictions on the next day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-05T12:00:00.000Z'))
    execFileMock.mockImplementation((_bin, _args, _options, callback) => {
      callback(null, {
        stdout: JSON.stringify({
          match_id: 'next-match',
          model_version: 'team-match-random-forest-v1',
          generated_at: new Date().toISOString(),
          team1_id: 'mumbai_indians',
          team2_id: 'chennai_super_kings',
          team1_probability: execFileMock.mock.calls.length === 1 ? 61 : 58,
          team2_probability: execFileMock.mock.calls.length === 1 ? 39 : 42,
          favorite_team_id: 'mumbai_indians',
          confidence: execFileMock.mock.calls.length === 1 ? 61 : 58,
          source: 'team_match_classifier',
        }),
      })
    })

    const first = await getTeamMatchPrediction('next-match')

    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'))
    const second = await getTeamMatchPrediction('next-match')

    expect(first.team1_probability).toBe(61)
    expect(second.team1_probability).toBe(58)
    expect(execFileMock).toHaveBeenCalledTimes(2)
  })
})
