import { validateSquad } from '@/lib/squad-validator'
import type { FantasySquadPlayer } from '@/lib/fantasy'

// ── Helpers ───────────────────────────────────────────────────────────────

function player(overrides: Partial<FantasySquadPlayer> & { player_id: string }): FantasySquadPlayer {
  return {
    name: overrides.player_id,
    fantasy_role: 'BAT',
    current_team_id: 'team-a',
    is_overseas: false,
    credit_value: 8,
    is_captain: false,
    is_vice_captain: false,
    ...overrides,
  }
}

/**
 * Build a baseline valid squad of 11 players.
 * Composition: 1 WK, 4 BAT, 1 AR, 4 BOWL, 1 captain, 1 vice-captain.
 * Players are spread across 4 teams so no team cap is triggered.
 * All domestic, total credits = 11 * 8 = 88 (under the 100 cap).
 */
function validSquad(): FantasySquadPlayer[] {
  return [
    player({ player_id: 'wk1', fantasy_role: 'WK', current_team_id: 'team-a', is_captain: true }),
    player({ player_id: 'bat1', fantasy_role: 'BAT', current_team_id: 'team-a', is_vice_captain: true }),
    player({ player_id: 'bat2', fantasy_role: 'BAT', current_team_id: 'team-a' }),
    player({ player_id: 'bat3', fantasy_role: 'BAT', current_team_id: 'team-b' }),
    player({ player_id: 'bat4', fantasy_role: 'BAT', current_team_id: 'team-b' }),
    player({ player_id: 'ar1', fantasy_role: 'AR', current_team_id: 'team-b' }),
    player({ player_id: 'bowl1', fantasy_role: 'BOWL', current_team_id: 'team-c' }),
    player({ player_id: 'bowl2', fantasy_role: 'BOWL', current_team_id: 'team-c' }),
    player({ player_id: 'bowl3', fantasy_role: 'BOWL', current_team_id: 'team-c' }),
    player({ player_id: 'bowl4', fantasy_role: 'BOWL', current_team_id: 'team-d' }),
    player({ player_id: 'wk2', fantasy_role: 'WK', current_team_id: 'team-d' }),
  ]
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('validateSquad', () => {
  it('accepts a valid 11-player squad', () => {
    const result = validateSquad(validSquad())
    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  describe('squad size', () => {
    it('rejects a squad with fewer than 11 players', () => {
      const squad = validSquad().slice(0, 10)
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'squad_size')).toBe(true)
    })

    it('rejects a squad with more than 11 players', () => {
      const squad = [...validSquad(), player({ player_id: 'extra', fantasy_role: 'BAT' })]
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'squad_size')).toBe(true)
    })
  })

  describe('fantasy_role', () => {
    it('flags a player with null fantasy_role', () => {
      const squad = validSquad()
      squad[0] = { ...squad[0], fantasy_role: null }
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'missing_role')).toBe(true)
    })

    it('rejects when WK count is below the minimum (1)', () => {
      // Replace both WK slots with BAT
      const squad = validSquad().map((p) =>
        p.fantasy_role === 'WK' ? { ...p, fantasy_role: 'BAT' as const } : p
      )
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'invalid_role_count')).toBe(true)
    })

    it('rejects when BOWL count is below the minimum (3)', () => {
      const squad = validSquad()
      // Replace 2 bowlers with AR players
      let replaced = 0
      const modified = squad.map((p) => {
        if (p.fantasy_role === 'BOWL' && replaced < 2) {
          replaced++
          return { ...p, fantasy_role: 'AR' as const }
        }
        return p
      })
      const result = validateSquad(modified)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'invalid_role_count')).toBe(true)
    })
  })

  describe('team cap', () => {
    it('rejects more than 7 players from the same IPL team', () => {
      const squad = validSquad().map((p) => ({ ...p, current_team_id: 'team-x' }))
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'team_cap')).toBe(true)
    })

    it('accepts exactly 7 players from the same team', () => {
      const squad = validSquad()
      let set = 0
      const modified = squad.map((p) => {
        if (set < 7) { set++; return { ...p, current_team_id: 'team-x' } }
        return { ...p, current_team_id: 'team-y' }
      })
      const result = validateSquad(modified)
      expect(result.issues.some((i) => i.code === 'team_cap')).toBe(false)
    })
  })

  describe('overseas cap', () => {
    it('rejects more than 4 overseas players', () => {
      const squad = validSquad()
      let count = 0
      const modified = squad.map((p) => {
        if (count < 5) { count++; return { ...p, is_overseas: true } }
        return p
      })
      const result = validateSquad(modified)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'overseas_cap')).toBe(true)
    })

    it('accepts exactly 4 overseas players', () => {
      const squad = validSquad()
      let count = 0
      const modified = squad.map((p) => {
        if (count < 4) { count++; return { ...p, is_overseas: true } }
        return p
      })
      const result = validateSquad(modified)
      expect(result.issues.some((i) => i.code === 'overseas_cap')).toBe(false)
    })
  })

  describe('credit cap', () => {
    it('rejects total credits exceeding 100', () => {
      const squad = validSquad().map((p) => ({ ...p, credit_value: 10 }))
      // 11 * 10 = 110 > 100
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'credit_cap')).toBe(true)
    })

    it('accepts exactly 100 credits', () => {
      const squad = validSquad()
      // Distribute exactly 100 credits across 11 players
      const modified = squad.map((p, idx) => ({
        ...p,
        credit_value: idx === 0 ? 12 : 8.8,
      }))
      // 12 + 10 * 8.8 = 12 + 88 = 100
      const result = validateSquad(modified)
      expect(result.issues.some((i) => i.code === 'credit_cap')).toBe(false)
    })
  })

  describe('captain / vice-captain', () => {
    it('rejects a squad with no captain', () => {
      const squad = validSquad().map((p) => ({ ...p, is_captain: false }))
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'captain_count')).toBe(true)
    })

    it('rejects a squad with two captains', () => {
      const squad = validSquad()
      squad[1] = { ...squad[1], is_captain: true }
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'captain_count')).toBe(true)
    })

    it('rejects a squad with no vice-captain', () => {
      const squad = validSquad().map((p) => ({ ...p, is_vice_captain: false }))
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'vice_captain_count')).toBe(true)
    })

    it('rejects the same player as captain and vice-captain', () => {
      const squad = validSquad()
      squad[0] = { ...squad[0], is_captain: true, is_vice_captain: true }
      squad[1] = { ...squad[1], is_vice_captain: false }
      const result = validateSquad(squad)
      expect(result.isValid).toBe(false)
      expect(result.issues.some((i) => i.code === 'captain_conflict')).toBe(true)
    })
  })

  describe('computed summary fields', () => {
    it('returns correct roleCounts', () => {
      const result = validateSquad(validSquad())
      expect(result.roleCounts).toEqual({ WK: 2, BAT: 4, AR: 1, BOWL: 4 })
    })

    it('returns correct overseasCount', () => {
      const squad = validSquad()
      squad[0] = { ...squad[0], is_overseas: true }
      squad[1] = { ...squad[1], is_overseas: true }
      const result = validateSquad(squad)
      expect(result.overseasCount).toBe(2)
    })

    it('returns correct totalCredits', () => {
      const squad = validSquad() // all credit_value = 8
      const result = validateSquad(squad)
      expect(result.totalCredits).toBe(88)
    })
  })
})
