export const MAX_TRANSFERS_PER_SEASON = 160

export type TransferSetupInput = {
  squadName: unknown
  transfersUsed: unknown
}

export type NormalizedTransferSetup =
  | {
      ok: true
      squadName: string
      transfersUsed: number
    }
  | {
      ok: false
      error: string
    }

export function normalizeTransferSetupInput(input: TransferSetupInput): NormalizedTransferSetup {
  if (typeof input.squadName !== 'string' || input.squadName.trim().length === 0) {
    return { ok: false, error: 'Squad name is required.' }
  }

  const transfersUsed = Number(input.transfersUsed)
  if (!Number.isFinite(transfersUsed)) {
    return { ok: false, error: 'Transfers used must be a number.' }
  }

  return {
    ok: true,
    squadName: input.squadName.trim(),
    transfersUsed: Math.max(0, Math.min(MAX_TRANSFERS_PER_SEASON, Math.trunc(transfersUsed))),
  }
}
