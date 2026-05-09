import pandas as pd

from ml.team_predict import (
    TEAM_MODEL_FEATURES,
    build_completed_match_audit_row,
    build_matchup_feature_row,
    build_team_training_frame,
    prediction_to_response,
    train_team_model_frame,
)


def _matches():
    return pd.DataFrame(
        [
            {
                "match_id": "m0",
                "season": "2023",
                "match_date": "2023-04-01",
                "venue_id": "wankhede",
                "team1_id": "rajasthan_royals",
                "team2_id": "mumbai_indians",
                "winner": "mumbai_indians",
            },
            {
                "match_id": "m1",
                "season": "2024",
                "match_date": "2024-04-01",
                "venue_id": "wankhede",
                "team1_id": "mumbai_indians",
                "team2_id": "chennai_super_kings",
                "winner": "mumbai_indians",
            },
            {
                "match_id": "m2",
                "season": "2024",
                "match_date": "2024-04-03",
                "venue_id": "chepauk",
                "team1_id": "chennai_super_kings",
                "team2_id": "rajasthan_royals",
                "winner": "chennai_super_kings",
            },
            {
                "match_id": "m3",
                "season": "2025",
                "match_date": "2025-04-01",
                "venue_id": "wankhede",
                "team1_id": "mumbai_indians",
                "team2_id": "rajasthan_royals",
                "winner": "mumbai_indians",
            },
            {
                "match_id": "m4",
                "season": "2025",
                "match_date": "2025-04-05",
                "venue_id": "chepauk",
                "team1_id": "chennai_super_kings",
                "team2_id": "mumbai_indians",
                "winner": "mumbai_indians",
            },
            {
                "match_id": "m5",
                "season": "2026",
                "match_date": "2026-04-01",
                "venue_id": "wankhede",
                "team1_id": "mumbai_indians",
                "team2_id": "chennai_super_kings",
                "winner": "mumbai_indians",
            },
            {
                "match_id": "m6",
                "season": "2026",
                "match_date": "2026-04-05",
                "venue_id": "chepauk",
                "team1_id": "rajasthan_royals",
                "team2_id": "chennai_super_kings",
                "winner": "chennai_super_kings",
            },
        ]
    )


def test_build_matchup_feature_row_uses_only_prior_matches():
    matches = _matches()

    row = build_matchup_feature_row(
        matches_df=matches,
        match_id="future",
        season="2026",
        match_date="2026-04-10",
        venue_id="wankhede",
        team1_id="mumbai_indians",
        team2_id="chennai_super_kings",
    )

    assert row["t1_alltime_wr"] > row["t2_alltime_wr"]
    assert row["h2h_t1_wr"] > 0.5
    assert row["venue_wr_diff"] > 0
    assert row["target_team1_win"] is None


def test_build_team_training_frame_creates_targets_and_features():
    frame = build_team_training_frame(_matches())

    assert set(TEAM_MODEL_FEATURES).issubset(frame.columns)
    assert "target_team1_win" in frame.columns
    assert frame["target_team1_win"].isin([0, 1]).all()
    assert len(frame) == 7


def test_train_team_model_frame_returns_classifier_metrics():
    frame = build_team_training_frame(_matches())

    result = train_team_model_frame(frame)

    assert "pipeline" in result
    assert result["train_rows"] > 0
    assert result["test_rows"] > 0
    assert set(result["metrics"]) == {"accuracy", "log_loss"}


def test_prediction_to_response_shapes_probability_payload():
    payload = prediction_to_response(
        match_id="next",
        model_version="team-match-rf-v1",
        team1_id="mumbai_indians",
        team2_id="chennai_super_kings",
        team1_probability=0.62,
    )

    assert payload["match_id"] == "next"
    assert payload["team1_probability"] == 62
    assert payload["team2_probability"] == 38
    assert payload["favorite_team_id"] == "mumbai_indians"
    assert payload["confidence"] == 62


def test_build_completed_match_audit_row_scores_actual_winner():
    row = {
        "match_id": "finished",
        "season": "2026",
        "match_date": "2026-05-06",
        "team1_id": "sunrisers_hyderabad",
        "team2_id": "punjab_kings",
        "winner": "punjab_kings",
    }

    audit = build_completed_match_audit_row(
        row,
        model_version="team-match-test-v1",
        team1_probability=0.57,
        generated_at="2026-05-06T00:00:00+00:00",
    )

    assert audit["match_id"] == "finished"
    assert audit["team1_probability"] == 57
    assert audit["team2_probability"] == 43
    assert audit["favorite_team_id"] == "sunrisers_hyderabad"
    assert audit["actual_winner"] == "punjab_kings"
    assert audit["was_correct"] is False
    assert audit["resolved_at"] == "2026-05-06T00:00:00+00:00"
