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

  it('is deterministic for the same standings and remaining fixtures', () => {
    const first = getSeasonWinnerOdds(standings, completedMatches, [nextMatch])
    const second = getSeasonWinnerOdds(standings, completedMatches, [nextMatch])

    expect(first.teams).toEqual(second.teams)
  })

  it('lets the remaining schedule affect projected title chances', () => {
    const tightStandings: TeamStanding[] = [
      { team_id: 'front_runner', wins: 5, losses: 0, played: 5 },
      { team_id: 'chaser', wins: 4, losses: 1, played: 5 },
      { team_id: 'struggler', wins: 0, losses: 5, played: 5 },
    ]
    const tightCompletedMatches: MatchSummary[] = [
      {
        match_id: 'played-1',
        match_date: '2026-04-01',
        team1_id: 'front_runner',
        team2_id: 'chaser',
        winner: 'front_runner',
        venue_id: null,
        season: '2026',
      },
      {
        match_id: 'played-2',
        match_date: '2026-04-02',
        team1_id: 'chaser',
        team2_id: 'struggler',
        winner: 'chaser',
        venue_id: null,
        season: '2026',
      },
    ]
    const favorableRun: UpcomingMatch[] = [
      {
        match_id: 'future-1',
        match_date: '2026-04-10',
        team1_id: 'chaser',
        team2_id: 'struggler',
        winner: null,
        venue_id: null,
        season: '2026',
      },
      {
        match_id: 'future-2',
        match_date: '2026-04-11',
        team1_id: 'chaser',
        team2_id: 'struggler',
        winner: null,
        venue_id: null,
        season: '2026',
      },
      {
        match_id: 'future-3',
        match_date: '2026-04-12',
        team1_id: 'chaser',
        team2_id: 'struggler',
        winner: null,
        venue_id: null,
        season: '2026',
      },
    ]

    const forecast = getSeasonWinnerOdds(tightStandings, tightCompletedMatches, favorableRun)

    expect(forecast.favorite_team_id).toBe('chaser')
    expect(forecast.teams[0].projected_points).toBeGreaterThan(forecast.teams[1].projected_points)
  })

  it('uses trained model probabilities for remaining fixture simulations when provided', () => {
    const modelDrivenStandings: TeamStanding[] = [
      { team_id: 'alpha', wins: 4, losses: 1, played: 5 },
      { team_id: 'beta', wins: 4, losses: 1, played: 5 },
    ]
    const futureMatch: UpcomingMatch = {
      match_id: 'model-future',
      match_date: '2026-04-10',
      team1_id: 'alpha',
      team2_id: 'beta',
      winner: null,
      venue_id: null,
      season: '2026',
    }

    const forecast = getSeasonWinnerOdds(modelDrivenStandings, [], [futureMatch], new Map([
      ['model-future', {
        match_id: 'model-future',
        model_version: 'team-match-gradient-boosting-v1',
        generated_at: '2026-05-06T00:00:00.000Z',
        team1_id: 'alpha',
        team2_id: 'beta',
        team1_probability: 5,
        team2_probability: 95,
        favorite_team_id: 'beta',
        confidence: 95,
        source: 'team_match_classifier',
      }],
    ]))

    expect(forecast.favorite_team_id).toBe('beta')
    expect(forecast.teams[0].title_probability).toBeGreaterThan(90)
  })

  it('gives playoff teams title odds even when they are not league-table leaders', () => {
    const playoffStandings: TeamStanding[] = [
      { team_id: 'leader', wins: 7, losses: 3, played: 10 },
      { team_id: 'second_seed', wins: 6, losses: 4, played: 10 },
      { team_id: 'rcb', wins: 6, losses: 4, played: 10 },
      { team_id: 'fourth_seed', wins: 5, losses: 5, played: 10 },
      { team_id: 'outside_playoffs', wins: 4, losses: 6, played: 10 },
    ]

    const forecast = getSeasonWinnerOdds(playoffStandings, [], [])
    const rcb = forecast.teams.find(team => team.team_id === 'rcb')
    const outsidePlayoffs = forecast.teams.find(team => team.team_id === 'outside_playoffs')

    expect(rcb?.title_probability).toBeGreaterThan(0)
    expect(outsidePlayoffs?.title_probability).toBe(0)
  })

  it('does not lock tied-point teams out of playoffs only because they are lower in current standings order', () => {
    const tiedStandings: TeamStanding[] = [
      { team_id: 'pbks', wins: 6, losses: 4, played: 10 },
      { team_id: 'rr', wins: 6, losses: 4, played: 10 },
      { team_id: 'gt', wins: 6, losses: 4, played: 10 },
      { team_id: 'srh', wins: 6, losses: 4, played: 10 },
      { team_id: 'csk', wins: 5, losses: 5, played: 10 },
      { team_id: 'dc', wins: 4, losses: 6, played: 10 },
      { team_id: 'rcb', wins: 6, losses: 4, played: 10 },
      { team_id: 'kkr', wins: 3, losses: 7, played: 10 },
      { team_id: 'mi', wins: 3, losses: 7, played: 10 },
      { team_id: 'lsg', wins: 2, losses: 8, played: 10 },
    ]

    const forecast = getSeasonWinnerOdds(tiedStandings, [], [])
    const rcb = forecast.teams.find(team => team.team_id === 'rcb')

    expect(rcb?.title_probability).toBeGreaterThan(0)
  })

  it('returns an empty forecast when standings are unavailable', () => {
    const forecast = getSeasonWinnerOdds([], [], [])

    expect(forecast.teams).toEqual([])
    expect(forecast.favorite_team_id).toBeNull()
  })
})
