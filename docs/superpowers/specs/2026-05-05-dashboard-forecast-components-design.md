# Dashboard Forecast Components Design

## Summary

Add two lightweight, engagement-oriented prediction components to the IPL dashboard:

- Season Winner Odds: season-level title probabilities for all IPL teams.
- Next Match Win Probability: team win probabilities for the next upcoming fixture.

The first version will use live data already available in cricAi instead of copying the external `IPL-Winner-Prediction-2026` repository. The implementation will adapt that repository's product ideas: team strength, matchup probability, season winner ranking, and future room for Monte Carlo simulation.

This is a dashboard forecast feature, not a betting-grade prediction engine.

## Placement

The approved placement is the contextual forecast-card layout:

- Season Winner Odds appears in the right dashboard column directly above the Points Table.
- Next Match Win Probability appears in the left dashboard column above Recent Matches.
- Existing fantasy player `UpcomingPredictions` remains separate so team-outcome forecasts do not get mixed with player fantasy projections.

This creates a clean split:

- Standings area: season-level title forecast.
- Match area: immediate next-fixture forecast.

## Forecast Approach

Version one will use a deterministic TypeScript forecast module fed by current dashboard data:

- current points table
- completed current-season match results
- upcoming fixtures
- recent team form
- head-to-head context when available
- remaining schedule context

This avoids adding a new Python model artifact before the UI and data contract are stable. It also keeps dashboard rendering reliable and explainable.

The module should expose clean functions that can later delegate to a trained Python ensemble or Monte Carlo simulator without changing the React components.

## Data Flow

Dashboard server component loads:

- latest IPL season
- current standings
- recent completed matches
- upcoming matches

Then it computes forecast payloads server-side:

- `getSeasonWinnerOdds(standings, completedMatches, upcomingMatches)`
- `getNextMatchWinProbability(upcomingMatch, completedMatches, standings)`

The React cards receive already-computed payloads as props and render synchronously.

## Next Match Win Probability

Input:

- the next upcoming match
- completed current-season matches
- standings

Output:

- match id and date
- both teams
- win probability for team 1
- win probability for team 2
- predicted favorite
- confidence
- short factor labels such as standings edge, recent form, and head-to-head

Scoring should blend:

- current standings strength
- recent form over latest completed matches
- head-to-head results if present
- neutral baseline when data is sparse

Probabilities should be bounded so early-season or sparse-data cases do not produce fake certainty.

## Season Winner Odds

Input:

- standings
- completed current-season matches
- upcoming matches

Output:

- ranked team list
- normalized title probability for each team
- top favorite
- generated context such as season and matches played

Scoring should blend:

- current points
- win rate
- recent form
- remaining fixture opportunity
- lightweight schedule strength from upcoming opponents

The output probabilities must sum to 100% within a 0.2 percentage-point rounding tolerance. Teams with little data should still receive non-zero probability through a baseline prior.

## UI Behavior

Season Winner Odds card:

- top team highlighted
- ranked list with team abbreviation, percentage, and horizontal probability bars
- compact enough to sit above the existing Points Table
- empty state when standings are unavailable

Next Match Win Probability card:

- both teams shown side by side
- percentage bars or split bar
- favorite badge
- date and venue if available
- empty state when no upcoming fixture exists

Both components should use the existing dashboard visual language: dark cards, small uppercase metadata, team colors, compact typography, and existing team avatar/config helpers where possible.

## Error Handling

No network or model calls are needed for version one, so failures should be limited to missing data:

- no standings: season odds card shows unavailable state
- no upcoming matches: next-match card shows unavailable state
- unknown team id: fall back to generated abbreviation and neutral color

## Testing

Add focused unit tests for the forecast module:

- probabilities are bounded
- next-match probabilities sum to 100 after rounding
- season odds include all standings teams
- season odds are sorted descending
- season odds sum to 100 within rounding tolerance
- sparse data returns neutral but valid probabilities

Run the existing project test/build commands after implementation.

## Future Upgrade Path

Later versions can replace the deterministic scorer with a trained team-outcome pipeline inspired by `IPL-Winner-Prediction-2026`:

- build historical team-strength features from cricAi data
- train a match winner model
- expose Python inference for matchup probability
- simulate remaining fixtures and playoffs
- blend live points table state with model outputs

The UI components should not need major changes for that upgrade.
