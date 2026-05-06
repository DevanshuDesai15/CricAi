import type { MatchSummary, TeamStanding, UpcomingMatch } from '@/lib/queries/matches'
import type { TeamMatchPredictionPayload } from '@/lib/predictions'

export interface ForecastFactor {
  label: string
  value: string
}

export interface NextMatchWinProbability {
  match_id: string
  match_date: string
  venue_id: string | null
  team1_id: string
  team2_id: string
  team1_probability: number
  team2_probability: number
  favorite_team_id: string
  confidence: number
  factors: ForecastFactor[]
}

export interface SeasonWinnerOddsTeam {
  rank: number
  team_id: string
  title_probability: number
  projected_points: number
  current_points: number
  form_label: string
}

export interface SeasonWinnerOdds {
  generated_at: string
  favorite_team_id: string | null
  teams: SeasonWinnerOddsTeam[]
}

const RECENT_FORM_WINDOW = 5
const SEASON_SIMULATION_COUNT = 10000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function getStanding(teamId: string, standings: TeamStanding[]): TeamStanding | null {
  return standings.find(team => team.team_id === teamId) ?? null
}

function getWinRate(teamId: string, standings: TeamStanding[]): number {
  const standing = getStanding(teamId, standings)
  if (!standing || standing.played === 0) return 0.5
  return standing.wins / standing.played
}

function isTeamInMatch(match: MatchSummary, teamId: string): boolean {
  return match.team1_id === teamId || match.team2_id === teamId
}

function getCompletedMatchesForTeam(teamId: string, completedMatches: MatchSummary[]): MatchSummary[] {
  return completedMatches
    .filter(match => match.winner && isTeamInMatch(match, teamId))
    .sort((left, right) => left.match_date.localeCompare(right.match_date))
}

function getRecentForm(teamId: string, completedMatches: MatchSummary[], window = RECENT_FORM_WINDOW): number {
  const matches = getCompletedMatchesForTeam(teamId, completedMatches).slice(-window)
  if (matches.length === 0) return 0.5

  const wins = matches.filter(match => match.winner === teamId).length
  return wins / matches.length
}

function getHeadToHeadRate(
  team1Id: string,
  team2Id: string,
  completedMatches: MatchSummary[]
): number {
  const matches = completedMatches.filter(match => {
    const hasTeams =
      (match.team1_id === team1Id && match.team2_id === team2Id) ||
      (match.team1_id === team2Id && match.team2_id === team1Id)
    return hasTeams && Boolean(match.winner)
  })

  if (matches.length === 0) return 0.5

  const team1Wins = matches.filter(match => match.winner === team1Id).length
  return team1Wins / matches.length
}

function formatSignedPoints(value: number): string {
  if (Math.abs(value) < 0.05) return 'Even'
  return `${value > 0 ? '+' : ''}${round1(value)} pts`
}

export function getNextMatchWinProbability(
  match: UpcomingMatch | null | undefined,
  completedMatches: MatchSummary[],
  standings: TeamStanding[],
  modelPrediction?: TeamMatchPredictionPayload | null
): NextMatchWinProbability | null {
  if (!match) return null

  if (
    modelPrediction &&
    modelPrediction.match_id === match.match_id &&
    modelPrediction.team1_id === match.team1_id &&
    modelPrediction.team2_id === match.team2_id
  ) {
    return {
      match_id: match.match_id,
      match_date: match.match_date,
      venue_id: match.venue_id,
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      team1_probability: modelPrediction.team1_probability,
      team2_probability: modelPrediction.team2_probability,
      favorite_team_id: modelPrediction.favorite_team_id,
      confidence: modelPrediction.confidence,
      factors: [
        { label: 'Model', value: modelPrediction.model_version },
        { label: 'Source', value: 'Historical IPL' },
        { label: 'Live layer', value: 'Standings fallback' },
      ],
    }
  }

  const team1WinRate = getWinRate(match.team1_id, standings)
  const team2WinRate = getWinRate(match.team2_id, standings)
  const team1Form = getRecentForm(match.team1_id, completedMatches)
  const team2Form = getRecentForm(match.team2_id, completedMatches)
  const headToHead = getHeadToHeadRate(match.team1_id, match.team2_id, completedMatches)

  const standingsEdge = clamp((team1WinRate - team2WinRate) * 10, -5, 5)
  const formEdge = clamp((team1Form - team2Form) * 8, -4, 4)
  const headToHeadEdge = clamp((headToHead - 0.5) * 6, -3, 3)
  const team1Probability = Math.round(clamp(50 + standingsEdge + formEdge + headToHeadEdge, 38, 62))
  const team2Probability = 100 - team1Probability
  const favoriteTeamId = team1Probability >= team2Probability ? match.team1_id : match.team2_id

  return {
    match_id: match.match_id,
    match_date: match.match_date,
    venue_id: match.venue_id,
    team1_id: match.team1_id,
    team2_id: match.team2_id,
    team1_probability: team1Probability,
    team2_probability: team2Probability,
    favorite_team_id: favoriteTeamId,
    confidence: Math.max(team1Probability, team2Probability),
    factors: [
      { label: 'Standings', value: formatSignedPoints(standingsEdge) },
      { label: 'Form', value: formatSignedPoints(formEdge) },
      { label: 'H2H', value: formatSignedPoints(headToHeadEdge) },
    ],
  }
}

function createSeededRandom(seed = 2026): () => number {
  let state = seed >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function normalizeRoundedProbabilities<T extends { title_probability: number }>(rows: T[]): T[] {
  const totalRounded = rows.reduce((sum, row) => sum + row.title_probability, 0)
  const delta = round1(100 - totalRounded)

  if (rows.length > 0 && Math.abs(delta) > 0) {
    rows[0].title_probability = round1(rows[0].title_probability + delta)
  }

  return rows
}

export function getSeasonWinnerOdds(
  standings: TeamStanding[],
  completedMatches: MatchSummary[],
  upcomingMatches: UpcomingMatch[]
): SeasonWinnerOdds {
  if (standings.length === 0) {
    return {
      generated_at: new Date().toISOString(),
      favorite_team_id: null,
      teams: [],
    }
  }

  const currentPointsByTeam = new Map(standings.map(team => [team.team_id, team.wins * 2]))
  const titleWinsByTeam = new Map(standings.map(team => [team.team_id, 0]))
  const projectedPointsByTeam = new Map(standings.map(team => [team.team_id, 0]))
  const matchForecasts = upcomingMatches.map(match => ({
    match,
    forecast: getNextMatchWinProbability(match, completedMatches, standings),
  }))
  const random = createSeededRandom()

  for (let simulation = 0; simulation < SEASON_SIMULATION_COUNT; simulation += 1) {
    const points = new Map(currentPointsByTeam)

    for (const { match, forecast } of matchForecasts) {
      const team1WinProbability = (forecast?.team1_probability ?? 50) / 100
      const winner = random() < team1WinProbability ? match.team1_id : match.team2_id
      points.set(winner, (points.get(winner) ?? 0) + 2)
    }

    for (const team of standings) {
      projectedPointsByTeam.set(
        team.team_id,
        (projectedPointsByTeam.get(team.team_id) ?? 0) + (points.get(team.team_id) ?? 0)
      )
    }

    const maxPoints = Math.max(...Array.from(points.values()))
    const tiedTeams = standings.filter(team => (points.get(team.team_id) ?? 0) === maxPoints)
    const titleShare = 1 / tiedTeams.length

    for (const team of tiedTeams) {
      titleWinsByTeam.set(team.team_id, (titleWinsByTeam.get(team.team_id) ?? 0) + titleShare)
    }
  }

  const simulated = standings.map(team => ({
    team_id: team.team_id,
    current_points: currentPointsByTeam.get(team.team_id) ?? 0,
    projected_points: round1((projectedPointsByTeam.get(team.team_id) ?? 0) / SEASON_SIMULATION_COUNT),
    form_label: `${Math.round(getRecentForm(team.team_id, completedMatches) * 100)}% form`,
    title_probability: round1(((titleWinsByTeam.get(team.team_id) ?? 0) / SEASON_SIMULATION_COUNT) * 100),
  })).sort((left, right) =>
    right.title_probability - left.title_probability ||
    right.projected_points - left.projected_points ||
    right.current_points - left.current_points ||
    left.team_id.localeCompare(right.team_id)
  )

  const teams = normalizeRoundedProbabilities(simulated).map((team, index) => ({
    rank: index + 1,
    team_id: team.team_id,
    title_probability: team.title_probability,
    projected_points: team.projected_points,
    current_points: team.current_points,
    form_label: team.form_label,
  }))

  return {
    generated_at: new Date().toISOString(),
    favorite_team_id: teams[0]?.team_id ?? null,
    teams,
  }
}
