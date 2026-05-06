import { getTransferGuidance } from '@/lib/transfer-guidance'

describe('getTransferGuidance', () => {
  it('recommends a conservative transfer count when matches exceed transfers', () => {
    expect(getTransferGuidance({
      transfersRemaining: 21,
      matchesRemaining: 26,
    })).toEqual({
      tone: 'caution',
      message: 'Transfer plan: 21 transfers left for 26 matches. Aim for 1 transfer this match unless the upgrade is high impact.',
    })
  })

  it('recommends a sustainable transfer count when transfer budget is healthy', () => {
    expect(getTransferGuidance({
      transfersRemaining: 28,
      matchesRemaining: 22,
    })).toEqual({
      tone: 'healthy',
      message: 'Transfer plan: 28 transfers left for 22 matches. Best pace: up to 1 transfer this match.',
    })
  })

  it('uses singular labels for one transfer and one match', () => {
    expect(getTransferGuidance({
      transfersRemaining: 1,
      matchesRemaining: 2,
    })).toEqual({
      tone: 'caution',
      message: 'Transfer plan: 1 transfer left for 2 matches. Aim for 1 transfer this match unless the upgrade is high impact.',
    })
  })

  it('shows a healthy budget message when transfers cover remaining matches', () => {
    expect(getTransferGuidance({
      transfersRemaining: 12,
      matchesRemaining: 8,
    })).toEqual({
      tone: 'healthy',
      message: 'Transfer plan: 12 transfers left for 8 matches. Best pace: up to 1 transfer this match.',
    })
  })

  it('returns null when season match context is unavailable', () => {
    expect(getTransferGuidance({
      transfersRemaining: 12,
      matchesRemaining: null,
    })).toBeNull()
  })
})
