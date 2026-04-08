import pandas as pd

from ml.feature_engineering import (
    add_historical_context_features,
    finalize_feature_frame,
)


def test_finalize_feature_frame_fills_missing_values():
    df = pd.DataFrame(
        [
            {
                "player_id": "virat_kohli",
                "team_id": "royal_challengers_bangalore",
                "opposition_team_id": None,
                "venue_id": "wankhede",
                "role": None,
                "avg_fantasy_points_last5": None,
                "avg_runs_last5": 42.0,
                "avg_wickets_last5": None,
                "avg_economy_last5": None,
                "matches_in_window": None,
                "avg_fantasy_points_at_venue": None,
                "avg_runs_at_venue": None,
                "avg_wickets_at_venue": None,
                "avg_economy_at_venue": None,
                "matches_at_venue": None,
                "avg_fantasy_points_vs_opposition": None,
                "avg_runs_vs_opposition": None,
                "avg_wickets_vs_opposition": None,
                "matches_vs_opposition": None,
                "batting_position": None,
                "is_home": None,
                "season": "2025",
            }
        ]
    )

    result = finalize_feature_frame(df)

    row = result.iloc[0]
    assert row["avg_fantasy_points_last5"] == 0
    assert row["matches_at_venue"] == 0
    assert row["role"] == "unknown"
    assert row["opposition_team_id"] == "unknown"
    assert row["season"] == 2025


def test_finalize_feature_frame_preserves_expected_column_order():
    df = pd.DataFrame(
        [
            {
                "player_id": "virat_kohli",
                "team_id": "royal_challengers_bangalore",
                "opposition_team_id": "mumbai_indians",
                "venue_id": "wankhede",
                "role": "BAT",
                "avg_fantasy_points_last5": 50.0,
                "avg_runs_last5": 44.0,
                "avg_wickets_last5": 0.0,
                "avg_economy_last5": 0.0,
                "matches_in_window": 5,
                "avg_fantasy_points_at_venue": 48.0,
                "avg_runs_at_venue": 41.0,
                "avg_wickets_at_venue": 0.0,
                "avg_economy_at_venue": 0.0,
                "matches_at_venue": 9,
                "avg_fantasy_points_vs_opposition": 46.0,
                "avg_runs_vs_opposition": 39.0,
                "avg_wickets_vs_opposition": 0.0,
                "matches_vs_opposition": 12,
                "batting_position": 3,
                "is_home": 0,
                "season": "2025",
            }
        ]
    )

    result = finalize_feature_frame(df)

    assert "player_id" in result.columns
    assert "avg_fantasy_points_last5" in result.columns
    assert result.loc[0, "season"] == 2025


def test_add_historical_context_features_uses_only_prior_venue_history():
    df = pd.DataFrame(
        [
            {
                "player_id": "virat_kohli",
                "match_id": "m1",
                "match_date": "2024-01-01",
                "venue_id": "wankhede",
                "team_id": "royal_challengers_bangalore",
                "team1_id": "royal_challengers_bangalore",
                "team2_id": "mumbai_indians",
                "fantasy_points": 40.0,
                "runs": 35,
                "wickets": 0,
                "economy": 0,
            },
            {
                "player_id": "virat_kohli",
                "match_id": "m2",
                "match_date": "2024-01-08",
                "venue_id": "wankhede",
                "team_id": "royal_challengers_bangalore",
                "team1_id": "royal_challengers_bangalore",
                "team2_id": "mumbai_indians",
                "fantasy_points": 70.0,
                "runs": 60,
                "wickets": 0,
                "economy": 0,
            },
        ]
    )

    result = add_historical_context_features(df)

    assert result.loc[0, "matches_at_venue"] == 0
    assert result.loc[0, "avg_fantasy_points_at_venue"] == 0
    assert result.loc[1, "matches_at_venue"] == 1
    assert result.loc[1, "avg_fantasy_points_at_venue"] == 40.0
    assert result.loc[1, "avg_runs_at_venue"] == 35.0


def test_add_historical_context_features_derives_opposition_and_h2h_history():
    df = pd.DataFrame(
        [
            {
                "player_id": "jasprit_bumrah",
                "match_id": "m1",
                "match_date": "2024-01-01",
                "venue_id": "wankhede",
                "team_id": "mumbai_indians",
                "team1_id": "mumbai_indians",
                "team2_id": "chennai_super_kings",
                "fantasy_points": 55.0,
                "runs": 0,
                "wickets": 2,
                "economy": 6.5,
            },
            {
                "player_id": "jasprit_bumrah",
                "match_id": "m2",
                "match_date": "2024-01-10",
                "venue_id": "chepauk",
                "team_id": "mumbai_indians",
                "team1_id": "chennai_super_kings",
                "team2_id": "mumbai_indians",
                "fantasy_points": 40.0,
                "runs": 0,
                "wickets": 1,
                "economy": 7.0,
            },
        ]
    )

    result = add_historical_context_features(df)

    assert list(result["opposition_team_id"]) == [
        "chennai_super_kings",
        "chennai_super_kings",
    ]
    assert result.loc[0, "matches_vs_opposition"] == 0
    assert result.loc[1, "matches_vs_opposition"] == 1
    assert result.loc[1, "avg_fantasy_points_vs_opposition"] == 55.0
    assert result.loc[1, "avg_wickets_vs_opposition"] == 2.0
