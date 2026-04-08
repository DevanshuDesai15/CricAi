import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params

  try {
    const { stdout } = await execFileAsync(
      'python',
      ['-m', 'ml.predict', '--match-id', matchId, '--format', 'json'],
      {
        cwd: `${process.cwd()}/scripts`,
        maxBuffer: 1024 * 1024,
      }
    )

    return NextResponse.json(JSON.parse(stdout))
  } catch (error: any) {
    const message = error?.stderr || error?.message || 'Prediction failed'

    return NextResponse.json(
      {
        error: 'prediction_failed',
        message: String(message),
      },
      { status: 500 }
    )
  }
}
