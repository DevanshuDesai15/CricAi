export const FANTASY_ROLES = ['WK', 'BAT', 'AR', 'BOWL'] as const

export type FantasyRole = (typeof FANTASY_ROLES)[number]

export interface FantasyPlayerCore {
  player_id: string
  name: string
  fantasy_role: FantasyRole | null
  current_team_id: string | null
  is_overseas: boolean | null
}

export interface FantasySquadPlayer extends FantasyPlayerCore {
  is_captain?: boolean
  is_vice_captain?: boolean
  credit_value?: number | null
}

export const FANTASY_ROLE_LIMITS: Record<FantasyRole, { min: number; max: number }> = {
  WK: { min: 1, max: 4 },
  BAT: { min: 3, max: 6 },
  AR: { min: 1, max: 4 },
  BOWL: { min: 3, max: 6 },
}

export function isFantasyRole(value: string | null | undefined): value is FantasyRole {
  return value !== null && value !== undefined && FANTASY_ROLES.includes(value as FantasyRole)
}
