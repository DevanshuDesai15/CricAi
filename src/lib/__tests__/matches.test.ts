jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { countRemainingMatches } from '@/lib/queries/matches'

const createServerSupabaseClientMock = createServerSupabaseClient as jest.Mock

describe('countRemainingMatches', () => {
  afterEach(() => {
    createServerSupabaseClientMock.mockReset()
  })

  it('counts unplayed matches from today onward for the requested league', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
    }
    query.not
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ count: 26, error: null })
    const supabase = {
      from: jest.fn().mockReturnValue(query),
    }
    createServerSupabaseClientMock.mockResolvedValue(supabase)

    const result = await countRemainingMatches('ipl')

    expect(result).toBe(26)
    expect(supabase.from).toHaveBeenCalledWith('matches')
    expect(query.select).toHaveBeenCalledWith('match_id', { count: 'exact', head: true })
    expect(query.eq).toHaveBeenCalledWith('league_id', 'ipl')
    expect(query.is).toHaveBeenCalledWith('winner', null)
    expect(query.gte).toHaveBeenCalledWith('match_date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(query.not).toHaveBeenCalledWith('team1_id', 'is', null)
    expect(query.not).toHaveBeenCalledWith('team2_id', 'is', null)
  })
})
