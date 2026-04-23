import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

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

export function getPythonErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as PythonExecError
    return execError.stderr || execError.message
  }

  return 'Prediction failed'
}

export async function getMatchPredictions(matchId: string): Promise<MatchPredictionPayload> {
  const { stdout } = await execFileAsync(
    'python',
    ['-m', 'ml.predict', '--match-id', matchId, '--format', 'json'],
    {
      cwd: `${process.cwd()}/scripts`,
      maxBuffer: 1024 * 1024,
    }
  )

  return JSON.parse(stdout) as MatchPredictionPayload
}
