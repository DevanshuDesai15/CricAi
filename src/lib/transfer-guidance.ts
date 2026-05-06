export interface TransferGuidanceInput {
  transfersRemaining: number
  matchesRemaining: number | null
}

export interface TransferGuidance {
  tone: 'caution' | 'healthy'
  message: string
}

export function getTransferGuidance({
  transfersRemaining,
  matchesRemaining,
}: TransferGuidanceInput): TransferGuidance | null {
  if (!matchesRemaining || matchesRemaining <= 0) return null

  const transfersLabel = transfersRemaining === 1 ? 'transfer' : 'transfers'
  const matchesLabel = matchesRemaining === 1 ? 'match' : 'matches'
  const recommendedTransfers = Math.max(1, Math.floor(transfersRemaining / matchesRemaining))
  const recommendedLabel = recommendedTransfers === 1 ? 'transfer' : 'transfers'
  const prefix = `Transfer plan: ${transfersRemaining} ${transfersLabel} left for ${matchesRemaining} ${matchesLabel}.`

  if (matchesRemaining > transfersRemaining) {
    return {
      tone: 'caution',
      message: `${prefix} Aim for 1 transfer this match unless the upgrade is high impact.`,
    }
  }

  return {
    tone: 'healthy',
    message: `${prefix} Best pace: up to ${recommendedTransfers} ${recommendedLabel} this match.`,
  }
}
