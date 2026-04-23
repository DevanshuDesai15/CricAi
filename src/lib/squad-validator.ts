import {
  FANTASY_ROLES,
  FANTASY_ROLE_LIMITS,
  type FantasyRole,
  type FantasySquadPlayer,
  isFantasyRole,
} from '@/lib/fantasy'

export interface SquadValidationIssue {
  code:
    | 'squad_size'
    | 'missing_role'
    | 'invalid_role_count'
    | 'team_cap'
    | 'overseas_cap'
    | 'credit_cap'
    | 'captain_count'
    | 'vice_captain_count'
    | 'captain_conflict'
  message: string
}

export interface SquadValidationResult {
  isValid: boolean
  issues: SquadValidationIssue[]
  roleCounts: Record<FantasyRole, number>
  overseasCount: number
  totalCredits: number
}

const MAX_SQUAD_SIZE = 11
const MAX_PLAYERS_PER_TEAM = 7
const MAX_OVERSEAS_PLAYERS = 4
const MAX_CREDITS = 100

export function getSquadRoleCounts(players: FantasySquadPlayer[]): Record<FantasyRole, number> {
  const roleCounts = createRoleCounts()

  for (const player of players) {
    if (isFantasyRole(player.fantasy_role)) {
      roleCounts[player.fantasy_role] += 1
    }
  }

  return roleCounts
}

export function getSquadCreditTotal(players: FantasySquadPlayer[]): number {
  return players.reduce((sum, player) => (
    sum + (typeof player.credit_value === 'number' ? player.credit_value : 0)
  ), 0)
}

export function getSquadOverseasCount(players: FantasySquadPlayer[]): number {
  return players.filter((player) => player.is_overseas).length
}

export function validateSquad(players: FantasySquadPlayer[]): SquadValidationResult {
  const issues: SquadValidationIssue[] = []
  const roleCounts = createRoleCounts()
  const teamCounts = new Map<string, number>()
  let overseasCount = 0
  let totalCredits = 0
  let captainCount = 0
  let viceCaptainCount = 0

  if (players.length !== MAX_SQUAD_SIZE) {
    issues.push({
      code: 'squad_size',
      message: `Squad must contain exactly ${MAX_SQUAD_SIZE} players.`,
    })
  }

  for (const player of players) {
    if (!isFantasyRole(player.fantasy_role)) {
      issues.push({
        code: 'missing_role',
        message: `${player.name} is missing a fantasy role and cannot be used in the Transfer Assistant.`,
      })
      continue
    }

    roleCounts[player.fantasy_role] += 1

    if (player.current_team_id) {
      const nextCount = (teamCounts.get(player.current_team_id) ?? 0) + 1
      teamCounts.set(player.current_team_id, nextCount)
    }

    if (player.is_overseas) overseasCount += 1
    if (typeof player.credit_value === 'number') totalCredits += player.credit_value
    if (player.is_captain) captainCount += 1
    if (player.is_vice_captain) viceCaptainCount += 1
    if (player.is_captain && player.is_vice_captain) {
      issues.push({
        code: 'captain_conflict',
        message: `${player.name} cannot be both captain and vice-captain.`,
      })
    }
  }

  for (const role of FANTASY_ROLES) {
    const { min, max } = FANTASY_ROLE_LIMITS[role]
    const count = roleCounts[role]

    if (count < min || count > max) {
      issues.push({
        code: 'invalid_role_count',
        message: `${role} count must be between ${min} and ${max}; received ${count}.`,
      })
    }
  }

  for (const [teamId, count] of teamCounts.entries()) {
    if (count > MAX_PLAYERS_PER_TEAM) {
      issues.push({
        code: 'team_cap',
        message: `Team ${teamId} exceeds the ${MAX_PLAYERS_PER_TEAM}-player cap with ${count} selections.`,
      })
    }
  }

  if (overseasCount > MAX_OVERSEAS_PLAYERS) {
    issues.push({
      code: 'overseas_cap',
      message: `Squad exceeds the ${MAX_OVERSEAS_PLAYERS}-player overseas cap with ${overseasCount} overseas players.`,
    })
  }

  if (totalCredits > MAX_CREDITS) {
    issues.push({
      code: 'credit_cap',
      message: `Squad exceeds the ${MAX_CREDITS}-credit cap with ${totalCredits} credits.`,
    })
  }

  if (captainCount !== 1) {
    issues.push({
      code: 'captain_count',
      message: `Squad must have exactly 1 captain; received ${captainCount}.`,
    })
  }

  if (viceCaptainCount !== 1) {
    issues.push({
      code: 'vice_captain_count',
      message: `Squad must have exactly 1 vice-captain; received ${viceCaptainCount}.`,
    })
  }

  return {
    isValid: issues.length === 0,
    issues,
    roleCounts,
    overseasCount,
    totalCredits,
  }
}

function createRoleCounts(): Record<FantasyRole, number> {
  return {
    WK: 0,
    BAT: 0,
    AR: 0,
    BOWL: 0,
  }
}
