import { normalizeCurrentSquadUpdateInput } from '@/lib/current-squad-update'

describe('normalizeCurrentSquadUpdateInput', () => {
  it('normalizes squad player selections and transfer count', () => {
    expect(normalizeCurrentSquadUpdateInput({
      transfersUsed: 12,
      players: [
        { player_id: 'kohli', is_captain: true, is_vice_captain: false },
        { player_id: 'axar', is_captain: false, is_vice_captain: true },
      ],
    })).toEqual({
      ok: true,
      transfersUsed: 12,
      totalPoints: 0,
      players: [
        { player_id: 'kohli', is_captain: true, is_vice_captain: false },
        { player_id: 'axar', is_captain: false, is_vice_captain: true },
      ],
    })
  })

  it('normalizes total points', () => {
    expect(normalizeCurrentSquadUpdateInput({
      transfersUsed: 12,
      totalPoints: 456.9,
      players: [
        { player_id: 'kohli', is_captain: true, is_vice_captain: false },
        { player_id: 'axar', is_captain: false, is_vice_captain: true },
      ],
    })).toMatchObject({
      ok: true,
      totalPoints: 456,
    })
  })

  it('rejects missing player arrays', () => {
    expect(normalizeCurrentSquadUpdateInput({
      transfersUsed: 12,
      players: null,
    })).toEqual({
      ok: false,
      error: 'Invalid squad payload.',
    })
  })

  it('rejects blank player ids', () => {
    expect(normalizeCurrentSquadUpdateInput({
      transfersUsed: 12,
      players: [{ player_id: ' ', is_captain: true, is_vice_captain: false }],
    })).toEqual({
      ok: false,
      error: 'Every selected player must have a player id.',
    })
  })
})
