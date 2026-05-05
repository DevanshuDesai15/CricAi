import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { UpcomingMatch } from '@/lib/queries/matches'

const execFileAsync = promisify(execFile)

type PredictionCacheValue = MatchPredictionPayload | TeamMatchPredictionPayload

const predictionCache = new Map<string, Promise<PredictionCacheValue>>()

type PythonExecError = Error & {
  stderr?: string
  stdout?: string
}

export interface MatchPredictionRow {
  rank: number
  player_id: string
  player_name: string
  team_id: string
  predicted_fantasy_points: number
}

export interface MatchPredictionPayload {
  match_id: string
  model_version: string
  generated_at: string
  predictions: MatchPredictionRow[]
}

export interface TeamMatchPredictionPayload {
  match_id: string
  model_version: string
  generated_at: string
  team1_id: string
  team2_id: string
  team1_probability: number
  team2_probability: number
  favorite_team_id: string
  confidence: number
  source: string
}

export interface TransferPredictionScores {
  scores: Map<string, number>
  fixtures_considered: string[]
  errors: string[]
}

export function getPythonErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as PythonExecError
    return execError.stderr || execError.message
  }

  return 'Prediction failed'
}

export function resolvePythonExecutable(): string {
  return process.env.CRICAI_PYTHON_BIN ?? 'python3'
}

function getPredictionCacheDay(): string {
  return new Date().toISOString().slice(0, 10)
}

function getPredictionCacheKey(type: string, matchId: string): string {
  return `${type}:${matchId}:${getPredictionCacheDay()}`
}

async function getCachedPrediction<T extends PredictionCacheValue>(
  type: string,
  matchId: string,
  loadPrediction: () => Promise<T>
): Promise<T> {
  const cacheKey = getPredictionCacheKey(type, matchId)
  const cached = predictionCache.get(cacheKey)

  if (cached) {
    return cached as Promise<T>
  }

  const pending = loadPrediction().catch(error => {
    predictionCache.delete(cacheKey)
    throw error
  })
  predictionCache.set(cacheKey, pending)
  return pending
}

export function clearPredictionCache(): void {
  predictionCache.clear()
}

export async function getMatchPredictions(matchId: string): Promise<MatchPredictionPayload> {
  return getCachedPrediction('match', matchId, async () => {
    const { stdout } = await execFileAsync(
      resolvePythonExecutable(),
      ['-m', 'ml.predict', '--match-id', matchId, '--format', 'json'],
      {
        cwd: `${process.cwd()}/scripts`,
        maxBuffer: 1024 * 1024,
      }
    )

    return JSON.parse(stdout) as MatchPredictionPayload
  })
}

export async function getTeamMatchPrediction(matchId: string): Promise<TeamMatchPredictionPayload> {
  return getCachedPrediction('team-match', matchId, async () => {
    const { stdout } = await execFileAsync(
      resolvePythonExecutable(),
      ['-m', 'ml.team_predict', '--match-id', matchId, '--format', 'json'],
      {
        cwd: `${process.cwd()}/scripts`,
        maxBuffer: 1024 * 1024,
      }
    )

    return JSON.parse(stdout) as TeamMatchPredictionPayload
  })
}

export async function getTransferPredictionScores(
  upcomingMatches: UpcomingMatch[]
): Promise<TransferPredictionScores> {
  const scores = new Map<string, number>()
  const fixturesConsidered: string[] = []
  const errors: string[] = []

  for (const match of upcomingMatches.slice(0, 1)) {
    try {
      const payload = await getMatchPredictions(match.match_id)
      fixturesConsidered.push(match.match_id)

      for (const row of payload.predictions) {
        scores.set(
          row.player_id,
          (scores.get(row.player_id) ?? 0) + row.predicted_fantasy_points
        )
      }
    } catch (error) {
      errors.push(`${match.match_id}: ${getPythonErrorMessage(error)}`)
    }
  }

  return {
    scores,
    fixtures_considered: fixturesConsidered,
    errors,
  }
}
