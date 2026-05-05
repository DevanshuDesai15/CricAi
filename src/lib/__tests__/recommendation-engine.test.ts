import { generateRecommendations } from '@/lib/recommendation-engine'
import type { PlayerWithPrediction } from '@/lib/recommendation-engine'

// ── Helpers ───────────────────────────────────────────────────────────────

let idCounter = 0
function pid() {
  return `p${++idCounter}`
}

function p(overrides: Partial<PlayerWithPrediction> & { player_id?: string }): PlayerWithPrediction {
  return {
    player_id: overrides.player_id ?? pid(),
    name: overrides.player_id ?? 'Player',
    fantasy_role: 'BAT',
    current_team_id: 'team-a',
    credit_value: 8,
    is_overseas: false,
    predicted_points: 40,
    is_captain: false,
    is_vice_captain: false,
    ...overrides,
  }
}

/**
 * Returns a valid 11-player squad: 1 WK (c), 4 BAT (vc on bat1), 1 AR, 4 BOWL.
 * Players are spread across 4 teams (max 3 per team) so no team cap is triggered.
 * All domestic, 8cr each = 88cr total.
 */
function squad11(): PlayerWithPrediction[] {
  idCounter = 0
  return [
    p({ player_id: 'wk1', fantasy_role: 'WK', current_team_id: 'team-a', is_captain: true, predicted_points: 50 }),
    p({ player_id: 'bat1', fantasy_role: 'BAT', current_team_id: 'team-a', is_vice_captain: true, predicted_points: 45 }),
    p({ player_id: 'bat2', fantasy_role: 'BAT', current_team_id: 'team-a', predicted_points: 30 }),
    p({ player_id: 'bat3', fantasy_role: 'BAT', current_team_id: 'team-b', predicted_points: 28 }),
    p({ player_id: 'bat4', fantasy_role: 'BAT', current_team_id: 'team-b', predicted_points: 25 }),
    p({ player_id: 'ar1', fantasy_role: 'AR', current_team_id: 'team-b', predicted_points: 35 }),
    p({ player_id: 'bowl1', fantasy_role: 'BOWL', current_team_id: 'team-c', predicted_points: 40 }),
    p({ player_id: 'bowl2', fantasy_role: 'BOWL', current_team_id: 'team-c', predicted_points: 38 }),
    p({ player_id: 'bowl3', fantasy_role: 'BOWL', current_team_id: 'team-c', predicted_points: 36 }),
    p({ player_id: 'bowl4', fantasy_role: 'BOWL', current_team_id: 'team-d', predicted_points: 20 }),
    p({ player_id: 'wk2', fantasy_role: 'WK', current_team_id: 'team-d', predicted_points: 18 }),
  ]
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('generateRecommendations', () => {
  describe('when transfers remaining is 0', () => {
    it('returns no swap suggestions', () => {
      const current = squad11()
      const result = generateRecommendations(current, [], 0)
      expect(result.swaps).toHaveLength(0)
    })

    it('still returns captain and vc suggestions', () => {
      const current = squad11()
      const result = generateRecommendations(current, [], 0)
      expect(result.captain_suggestion).not.toBeNull()
      expect(result.vc_suggestion).not.toBeNull()
    })
  })

  describe('like-for-like role enforcement', () => {
    it('only suggests swapping a BAT for another BAT', () => {
      const current = squad11()
      // Add a high-scoring BOWL to the pool (team-e) — must NOT appear for a BAT slot
      const pool = [
        p({ player_id: 'bowl-new', fantasy_role: 'BOWL', predicted_points: 999, current_team_id: 'team-e' }),
        p({ player_id: 'bat-new', fantasy_role: 'BAT', predicted_points: 999, current_team_id: 'team-e' }),
      ]
      const result = generateRecommendations(current, pool, 3)
      expect(result.swaps.length).toBeGreaterThan(0)
      for (const swap of result.swaps) {
        expect(swap.player_in.fantasy_role).toBe(swap.player_out.fantasy_role)
      }
    })
  })

  describe('budget constraint', () => {
    it('limits incoming player credit to remaining squad budget after removing outgoing player', () => {
      const current = squad11().map((player) => {
        if (player.player_id === 'wk1') return { ...player, credit_value: 21 }
        if (player.player_id === 'bat2') return { ...player, credit_value: 7, predicted_points: 20 }
        return player
      })
      const unaffordableUpgrade = p({
        player_id: 'bat-7-5cr',
        fantasy_role: 'BAT',
        credit_value: 7.5,
        predicted_points: 26,
        current_team_id: 'team-e',
      })

      const result = generateRecommendations(current, [unaffordableUpgrade], 3)

      expect(result.swaps.some((swap) => swap.player_out.player_id === 'bat2')).toBe(false)
    })

    it('allows incoming player credit when unused team credit creates breathing room', () => {
      const current = squad11().map((player) => {
        if (player.player_id === 'wk1') return { ...player, credit_value: 19 }
        if (player.player_id === 'bat2') return { ...player, credit_value: 7, predicted_points: 20 }
        return player
      })
      const affordableUpgrade = p({
        player_id: 'bat-8cr',
        fantasy_role: 'BAT',
        credit_value: 8,
        predicted_points: 26,
        current_team_id: 'team-e',
      })

      const result = generateRecommendations(current, [affordableUpgrade], 3)

      expect(result.swaps.some((swap) => (
        swap.player_out.player_id === 'bat2'
        && swap.player_in.player_id === 'bat-8cr'
      ))).toBe(true)
    })

    it('allows a higher-credit incoming player when unused squad credits cover the difference', () => {
      const current = squad11().map((player) =>
        player.player_id === 'wk1'
          ? { ...player, credit_value: 19 }
          : player
      )
      const affordableUpgrade = p({
        player_id: 'bat-9cr',
        fantasy_role: 'BAT',
        credit_value: 9,
        predicted_points: 999,
        current_team_id: 'team-e',
      })
      const result = generateRecommendations(current, [affordableUpgrade], 3)

      expect(result.swaps.some((swap) => swap.player_in.player_id === 'bat-9cr')).toBe(true)
    })

    it('excludes swaps that would push credits over 100', () => {
      const current = squad11() // 88 cr total, headroom = 12
      // Swap candidate costs 8 (out) + 25 (in) → net +17cr, 88 - 8 + 25 = 105 > 100
      const expensiveBat = p({
        player_id: 'bat-expensive',
        fantasy_role: 'BAT',
        credit_value: 25,
        predicted_points: 999,
        current_team_id: 'team-b',
      })
      const result = generateRecommendations(current, [expensiveBat], 3)
      const involveExpensive = result.swaps.some((s) => s.player_in.player_id === 'bat-expensive')
      expect(involveExpensive).toBe(false)
    })
  })

  describe('fixture timing protection', () => {
    it('does not suggest transferring out a player whose team plays in the next fixture window', () => {
      const current = squad11().map((player) =>
        player.player_id === 'bat4'
          ? { ...player, current_team_id: 'team-protected', predicted_points: 0 }
          : player
      )
      const replacement = p({
        player_id: 'bat-current-match',
        fantasy_role: 'BAT',
        credit_value: 8,
        predicted_points: 999,
        current_team_id: 'team-e',
      })

      const result = generateRecommendations(current, [replacement], 3, 5, {
        protectedOutgoingTeamIds: ['team-protected'],
      })

      expect(result.swaps.some((swap) => swap.player_out.player_id === 'bat4')).toBe(false)
    })
  })

  describe('overseas cap constraint', () => {
    it('excludes swaps that would cause more than 4 overseas players', () => {
      // Assign the 4 overseas slots to non-BAT positions (WK, AR, BOWL).
      // All BAT players are domestic. Swapping a domestic BAT out for an overseas
      // BAT would push overseas from 4 → 5, exceeding the cap.
      const current = squad11()
      const modified = current.map((pl) => {
        if (pl.player_id === 'wk1' || pl.player_id === 'wk2' || pl.player_id === 'ar1' || pl.player_id === 'bowl1') {
          return { ...pl, is_overseas: true }
        }
        return { ...pl, is_overseas: false }
      })

      const overseasBat = p({
        player_id: 'bat-overseas',
        fantasy_role: 'BAT',
        is_overseas: true,
        predicted_points: 999,
        credit_value: 8,
        current_team_id: 'team-e',
      })
      const result = generateRecommendations(modified, [overseasBat], 3)
      const involveOverseas = result.swaps.some((s) => s.player_in.player_id === 'bat-overseas')
      expect(involveOverseas).toBe(false)
    })
  })

  describe('team cap constraint', () => {
    it('excludes swaps that would put more than 7 players from the same team', () => {
      // Build a squad where exactly 7 players are from team-x (WK, AR, BOWL slots),
      // and all 4 BAT slots are from team-y. Swapping any BAT(team-y) → BAT(team-x)
      // would push team-x from 7 to 8, which must be rejected.
      const current = squad11()
      const modified = current.map((pl) => {
        if (pl.fantasy_role === 'BAT') return { ...pl, current_team_id: 'team-y' }
        return { ...pl, current_team_id: 'team-x' } // WK(2) + AR(1) + BOWL(4) = 7
      })

      const teamXBat = p({
        player_id: 'bat-teamx',
        fantasy_role: 'BAT',
        current_team_id: 'team-x',
        predicted_points: 999,
        credit_value: 8,
      })
      const result = generateRecommendations(modified, [teamXBat], 3)
      const involveTeamX = result.swaps.some((s) => s.player_in.player_id === 'bat-teamx')
      expect(involveTeamX).toBe(false)
    })
  })

  describe('positive score gate', () => {
    it('excludes swaps where points gain does not exceed the transfer cost penalty', () => {
      const current = squad11()
      // bat4 (team-b, 25pts) — offer a bat with only 1 more point (net gain = 1, penalty = 5 → score ≤ 0)
      const marginalBat = p({
        player_id: 'bat-marginal',
        fantasy_role: 'BAT',
        predicted_points: 26,
        credit_value: 8,
        current_team_id: 'team-e',
      })
      const result = generateRecommendations(current, [marginalBat], 3)
      const involveMarginal = result.swaps.some((s) => s.player_in.player_id === 'bat-marginal')
      expect(involveMarginal).toBe(false)
    })

    it('allows a 6-point upgrade when transfer pressure is low', () => {
      const current = squad11()
      const usefulBat = p({
        player_id: 'bat-useful',
        fantasy_role: 'BAT',
        predicted_points: 31,
        credit_value: 8,
        current_team_id: 'team-e',
      })

      const result = generateRecommendations(current, [usefulBat], 3, 5, {
        matchesRemaining: 3,
      })

      expect(result.swaps.some((swap) => (
        swap.player_out.player_id === 'bat4'
        && swap.player_in.player_id === 'bat-useful'
      ))).toBe(true)
    })

    it('rejects the same 6-point upgrade when transfers are scarcer than remaining matches', () => {
      const current = squad11()
      const usefulBat = p({
        player_id: 'bat-useful',
        fantasy_role: 'BAT',
        predicted_points: 31,
        credit_value: 8,
        current_team_id: 'team-e',
      })

      const result = generateRecommendations(current, [usefulBat], 21, 5, {
        matchesRemaining: 26,
      })

      expect(result.swaps.some((swap) => swap.player_in.player_id === 'bat-useful')).toBe(false)
    })
  })

  describe('deduplication', () => {
    it('does not suggest the same outgoing player twice', () => {
      const current = squad11()
      // Offer several high-scoring BATs from fresh teams — only one should appear per outgoing player
      const pool = [
        p({ player_id: 'bat-a', fantasy_role: 'BAT', predicted_points: 80, current_team_id: 'team-e' }),
        p({ player_id: 'bat-b', fantasy_role: 'BAT', predicted_points: 75, current_team_id: 'team-e' }),
        p({ player_id: 'bat-c', fantasy_role: 'BAT', predicted_points: 70, current_team_id: 'team-e' }),
      ]
      const result = generateRecommendations(current, pool, 5)
      const outgoingIds = result.swaps.map((s) => s.player_out.player_id)
      const uniqueIds = new Set(outgoingIds)
      expect(outgoingIds.length).toBe(uniqueIds.size)
    })
  })

  describe('captain and vc suggestions', () => {
    it('suggests the highest predicted_points player as captain', () => {
      const current = squad11()
      // wk1 has 50 points — highest
      const result = generateRecommendations(current, [], 0)
      expect(result.captain_suggestion?.player_id).toBe('wk1')
    })

    it('suggests the second-highest predicted_points player as vc', () => {
      const current = squad11()
      // bat1 has 45 points — second highest
      const result = generateRecommendations(current, [], 0)
      expect(result.vc_suggestion?.player_id).toBe('bat1')
    })
  })
})
