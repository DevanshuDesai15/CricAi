import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { NextResponse } from 'next/server'

const execFileAsync = promisify(execFile)

type PythonExecError = Error & {
  stderr?: string
  stdout?: string
}

function getPythonErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as PythonExecError
    return execError.stderr || execError.message
  }

  return 'Prediction failed'
}

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
