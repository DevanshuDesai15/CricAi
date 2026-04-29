import { mapUserSquadRow } from '@/lib/queries/user-squad'

describe('mapUserSquadRow', () => {
  it('hydrates players when Supabase returns the joined player as an object', () => {
    const result = mapUserSquadRow({
      id: 1,
      name: 'Smashing XI',
      user_squad_players: [
        {
          is_captain: true,
          is_vice_captain: false,
          players: {
            player_id: 'ba607b88',
            name: 'V Kohli',
            fantasy_role: 'BAT',
            current_team_id: 'royal_challengers_bangalore',
            credit_value: '10.5',
            is_overseas: false,
            country: 'India',
          },
        },
      ],
    })

    expect(result.players).toEqual([
      {
        player_id: 'ba607b88',
        name: 'V Kohli',
        fantasy_role: 'BAT',
        current_team_id: 'royal_challengers_bangalore',
        credit_value: 10.5,
        is_overseas: false,
        country: 'India',
        is_captain: true,
        is_vice_captain: false,
      },
    ])
  })
})
