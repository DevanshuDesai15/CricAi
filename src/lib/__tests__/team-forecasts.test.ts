import {
  getNextMatchWinProbability,
  getSeasonWinnerOdds,
} from '@/lib/team-forecasts'
import type { MatchSummary, TeamStanding, UpcomingMatch } from '@/lib/queries/matches'

const standings: TeamStanding[] = [
  { team_id: 'mumbai_indians', wins: 4, losses: 1, played: 5 },
  { team_id: 'chennai_super_kings', wins: 2, losses: 3, played: 5 },
  { team_id: 'rajasthan_royals', wins: 1, losses: 4, played: 5 },
]

const completedMatches: MatchSummary[] = [
  {
    match_id: 'm1',
    match_date: '2026-04-01',
    team1_id: 'mumbai_indians',
    team2_id: 'chennai_super_kings',
    winner: 'mumbai_indians',
    venue_id: 'wankhede',
    season: '2026',
  },
  {
    match_id: 'm2',
    match_date: '2026-04-02',
    team1_id: 'mumbai_indians',
    team2_id: 'rajasthan_royals',
    winner: 'mumbai_indians',
    venue_id: null,
    season: '2026',
  },
  {
    match_id: 'm3',
    match_date: '2026-04-03',
    team1_id: 'chennai_super_kings',
    team2_id: 'rajasthan_royals',
    winner: 'chennai_super_kings',
    venue_id: null,
    season: '2026',
  },
]

const nextMatch: UpcomingMatch = {
  match_id: 'next',
  match_date: '2026-04-10',
  team1_id: 'mumbai_indians',
  team2_id: 'chennai_super_kings',
  winner: null,
  venue_id: 'wankhede',
  season: '2026',
}

describe('getNextMatchWinProbability', () => {
  it('returns bounded probabilities that sum to 100', () => {
    const forecast = getNextMatchWinProbability(nextMatch, completedMatches, standings)

    expect(forecast).not.toBeNull()
    expect(forecast?.team1_probability).toBeGreaterThanOrEqual(38)
    expect(forecast?.team1_probability).toBeLessThanOrEqual(62)
    expect(forecast?.team2_probability).toBeGreaterThanOrEqual(38)
    expect(forecast?.team2_probability).toBeLessThanOrEqual(62)
    expect((forecast?.team1_probability ?? 0) + (forecast?.team2_probability ?? 0)).toBe(100)
    expect(forecast?.favorite_team_id).toBe('mumbai_indians')
  })

  it('returns a neutral forecast when team context is sparse', () => {
    const forecast = getNextMatchWinProbability(
      { ...nextMatch, team1_id: 'new_team_a', team2_id: 'new_team_b' },
      [],
      []
    )

    expect(forecast?.team1_probability).toBe(50)
    expect(forecast?.team2_probability).toBe(50)
    expect(forecast?.favorite_team_id).toBe('new_team_a')
  })

  it('prefers model probabilities when a model payload is available', () => {
    const forecast = getNextMatchWinProbability(nextMatch, completedMatches, standings, {
      match_id: 'next',
      model_version: 'team-match-random-forest-v1',
      generated_at: '2026-05-05T00:00:00.000Z',
      team1_id: 'mumbai_indians',
      team2_id: 'chennai_super_kings',
      team1_probability: 61,
      team2_probability: 39,
      favorite_team_id: 'mumbai_indians',
      confidence: 61,
      source: 'team_match_classifier',
    })

    expect(forecast?.team1_probability).toBe(61)
    expect(forecast?.team2_probability).toBe(39)
    expect(forecast?.factors[0]).toEqual({ label: 'Model', value: 'team-match-random-forest-v1' })
  })
})

describe('getSeasonWinnerOdds', () => {
  it('returns sorted odds for every standings team', () => {
    const forecast = getSeasonWinnerOdds(standings, completedMatches, [nextMatch])

    expect(forecast.teams.map(team => team.team_id)).toEqual([
      'mumbai_indians',
      'chennai_super_kings',
      'rajasthan_royals',
    ])
    expect(forecast.teams[0].rank).toBe(1)
    expect(forecast.favorite_team_id).toBe('mumbai_indians')
  })

  it('normalizes rounded season odds to 100 percent', () => {
    const forecast = getSeasonWinnerOdds(standings, completedMatches, [nextMatch])
    const total = forecast.teams.reduce((sum, team) => sum + team.title_probability, 0)

    expect(total).toBeCloseTo(100, 1)
  })

  it('returns an empty forecast when standings are unavailable', () => {
    const forecast = getSeasonWinnerOdds([], [], [])

    expect(forecast.teams).toEqual([])
    expect(forecast.favorite_team_id).toBeNull()
  })
})
