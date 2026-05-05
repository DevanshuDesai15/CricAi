import { normalizeTransferSetupInput } from '@/lib/transfer-setup'

describe('normalizeTransferSetupInput', () => {
  it('trims squad name and preserves valid transfers used', () => {
    expect(normalizeTransferSetupInput({
      squadName: '  Smashing XI  ',
      transfersUsed: 46,
    })).toEqual({
      ok: true,
      squadName: 'Smashing XI',
      transfersUsed: 46,
      totalPoints: 0,
    })
  })

  it('normalizes total points', () => {
    expect(normalizeTransferSetupInput({
      squadName: 'Smashing XI',
      transfersUsed: 46,
      totalPoints: 789.3,
    })).toMatchObject({
      ok: true,
      totalPoints: 789,
    })
  })

  it('rejects an empty squad name', () => {
    expect(normalizeTransferSetupInput({
      squadName: '   ',
      transfersUsed: 46,
    })).toEqual({
      ok: false,
      error: 'Squad name is required.',
    })
  })

  it('clamps transfers used to the season bounds', () => {
    expect(normalizeTransferSetupInput({
      squadName: 'Smashing XI',
      transfersUsed: 175,
    })).toMatchObject({
      ok: true,
      transfersUsed: 160,
    })

    expect(normalizeTransferSetupInput({
      squadName: 'Smashing XI',
      transfersUsed: -4,
    })).toMatchObject({
      ok: true,
      transfersUsed: 0,
    })
  })

  it('rejects non-numeric transfers used', () => {
    expect(normalizeTransferSetupInput({
      squadName: 'Smashing XI',
      transfersUsed: Number.NaN,
    })).toEqual({
      ok: false,
      error: 'Transfers used must be a number.',
    })
  })
})
