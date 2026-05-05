export type TeamConfig = {
  abbr: string
  color: string
  secondaryColor: string
}

const TEAM_CONFIG: Record<string, TeamConfig> = {
  mumbai_indians: { abbr: 'MI', color: '#004ba0', secondaryColor: '#d4a017' },
  chennai_super_kings: { abbr: 'CSK', color: '#fdb913', secondaryColor: '#1a5276' },
  royal_challengers_bangalore: { abbr: 'RCB', color: '#ec1c24', secondaryColor: '#1a1a1a' },
  kolkata_knight_riders: { abbr: 'KKR', color: '#3a225d', secondaryColor: '#d4a017' },
  delhi_capitals: { abbr: 'DC', color: '#0078bc', secondaryColor: '#ef1c25' },
  punjab_kings: { abbr: 'PBKS', color: '#d71920', secondaryColor: '#a7a9ac' },
  rajasthan_royals: { abbr: 'RR', color: '#254aa5', secondaryColor: '#ff69b4' },
  sunrisers_hyderabad: { abbr: 'SRH', color: '#f7a721', secondaryColor: '#e8461a' },
  gujarat_titans: { abbr: 'GT', color: '#1c2951', secondaryColor: '#6db4e2' },
  lucknow_super_giants: { abbr: 'LSG', color: '#a72b2a', secondaryColor: '#5bc2e7' },
}

export function getTeamConfig(teamId: string): TeamConfig {
  const tid = teamId.toLowerCase().replace(/[\s_-]+/g, '_')

  if (TEAM_CONFIG[tid]) return TEAM_CONFIG[tid]

  const key = Object.keys(TEAM_CONFIG).find(candidate => {
    const prefix = candidate.split('_')[0]
    return tid.startsWith(prefix) || candidate.startsWith(tid.split('_')[0])
  })

  if (key) return TEAM_CONFIG[key]

  const abbrKey = Object.keys(TEAM_CONFIG).find(
    candidate => TEAM_CONFIG[candidate].abbr.toLowerCase() === tid
  )
  if (abbrKey) return TEAM_CONFIG[abbrKey]

  return {
    abbr: teamId.length <= 4 ? teamId.toUpperCase() : teamId.slice(0, 3).toUpperCase(),
    color: '#6366f1',
    secondaryColor: '#f97316',
  }
}

export function formatTeamName(teamId: string): string {
  return teamId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}
