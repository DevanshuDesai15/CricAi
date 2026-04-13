import pandas as pd
import pytest

from ml import predict as predict_module
from ml.feature_engineering import (
    InferenceDataError,
    infer_recent_team_xi,
    resolve_match_player_pool,
)


def test_infer_recent_team_xi_returns_latest_team_players():
    matches_df = pd.DataFrame(
        [
            {"match_id": "old", "match_date": "2026-03-20", "team1_id": "mi", "team2_id": "csk", "winner": "mi"},
            {"match_id": "latest", "match_date": "2026-03-28", "team1_id": "rcb", "team2_id": "mi", "winner": "mi"},
        ]
    )
    stats_df = pd.DataFrame(
        [
            {"match_id": "old", "team_id": "mi", "player_id": "p1", "batting_position": 1},
            {"match_id": "old", "team_id": "mi", "player_id": "p2", "batting_position": 2},
            {"match_id": "latest", "team_id": "mi", "player_id": "p3", "batting_position": 1},
            {"match_id": "latest", "team_id": "mi", "player_id": "p4", "batting_position": 2},
            {"match_id": "latest", "team_id": "mi", "player_id": "p5", "batting_position": 3},
            {"match_id": "latest", "team_id": "mi", "player_id": "p6", "batting_position": 4},
            {"match_id": "latest", "team_id": "mi", "player_id": "p7", "batting_position": 5},
            {"match_id": "latest", "team_id": "mi", "player_id": "p8", "batting_position": 6},
            {"match_id": "latest", "team_id": "mi", "player_id": "p9", "batting_position": 7},
            {"match_id": "latest", "team_id": "mi", "player_id": "p10", "batting_position": 8},
            {"match_id": "latest", "team_id": "mi", "player_id": "p11", "batting_position": 9},
            {"match_id": "latest", "team_id": "mi", "player_id": "p12", "batting_position": 10},
            {"match_id": "latest", "team_id": "mi", "player_id": "p13", "batting_position": 11},
        ]
    )

    xi = infer_recent_team_xi(
        team_id="mi",
        target_match_date="2026-04-01",
        matches_df=matches_df,
        stats_df=stats_df,
    )

    assert [row["player_id"] for row in xi] == [f"p{idx}" for idx in range(3, 14)]
    assert [row["batting_order"] for row in xi] == list(range(1, 12))


def test_infer_recent_team_xi_normalizes_team_ids_before_filtering():
    matches_df = pd.DataFrame(
        [
            {"match_id": 101, "match_date": "2026-03-20", "team1_id": 7, "team2_id": 8, "winner": 7},
            {"match_id": 102, "match_date": "2026-03-28", "team1_id": 9, "team2_id": "7", "winner": "7"},
        ]
    )
    stats_df = pd.DataFrame(
        [
            {"match_id": 101, "team_id": 7, "player_id": "old_1", "batting_position": 1},
            {"match_id": 102, "team_id": "7", "player_id": "new_1", "batting_position": 1},
            {"match_id": 102, "team_id": 7, "player_id": "new_2", "batting_position": 2},
            {"match_id": 102, "team_id": "7", "player_id": "new_3", "batting_position": 3},
            {"match_id": 102, "team_id": 7, "player_id": "new_4", "batting_position": 4},
            {"match_id": 102, "team_id": "7", "player_id": "new_5", "batting_position": 5},
            {"match_id": 102, "team_id": 7, "player_id": "new_6", "batting_position": 6},
            {"match_id": 102, "team_id": "7", "player_id": "new_7", "batting_position": 7},
            {"match_id": 102, "team_id": 7, "player_id": "new_8", "batting_position": 8},
            {"match_id": 102, "team_id": "7", "player_id": "new_9", "batting_position": 9},
            {"match_id": 102, "team_id": 7, "player_id": "new_10", "batting_position": 10},
            {"match_id": 102, "team_id": "7", "player_id": "new_11", "batting_position": 11},
        ]
    )

    xi = infer_recent_team_xi(
        team_id="7",
        target_match_date="2026-04-01",
        matches_df=matches_df,
        stats_df=stats_df,
    )

    assert [row["player_id"] for row in xi] == [f"new_{idx}" for idx in range(1, 12)]


def test_resolve_match_player_pool_prefers_team_compositions():
    match_row = {"match_id": "future_1", "match_date": "2026-04-10", "team1_id": "mi", "team2_id": "csk"}
    compositions_df = pd.DataFrame(
        [
            {"match_id": "future_1", "team_id": "mi", "player_id": "a1", "batting_order": 1},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a2", "batting_order": 2},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b1", "batting_order": 1},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b2", "batting_order": 2},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a3", "batting_order": 3},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b3", "batting_order": 3},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a4", "batting_order": 4},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b4", "batting_order": 4},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a5", "batting_order": 5},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b5", "batting_order": 5},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a6", "batting_order": 6},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b6", "batting_order": 6},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a7", "batting_order": 7},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b7", "batting_order": 7},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a8", "batting_order": 8},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b8", "batting_order": 8},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a9", "batting_order": 9},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b9", "batting_order": 9},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a10", "batting_order": 10},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b10", "batting_order": 10},
            {"match_id": "future_1", "team_id": "mi", "player_id": "a11", "batting_order": 11},
            {"match_id": "future_1", "team_id": "csk", "player_id": "b11", "batting_order": 11},
        ]
    )

    resolved = resolve_match_player_pool(
        match_row=match_row,
        compositions_df=compositions_df,
        matches_df=pd.DataFrame(),
        stats_df=pd.DataFrame(),
    )

    assert resolved["source"] == "team_compositions"
    assert {row["player_id"] for row in resolved["rows"]} == {f"a{idx}" for idx in range(1, 12)} | {f"b{idx}" for idx in range(1, 12)}
    assert {row["match_id"] for row in resolved["rows"]} == {"future_1"}


def test_resolve_match_player_pool_raises_insufficient_player_pool():
    match_row = {"match_id": "future_2", "match_date": "2026-04-10", "team1_id": "mi", "team2_id": "csk"}
    matches_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "match_date": "2026-04-01", "team1_id": "mi", "team2_id": "rr", "winner": "mi"},
            {"match_id": "csk_last", "match_date": "2026-04-02", "team1_id": "csk", "team2_id": "gt", "winner": "csk"},
        ]
    )
    stats_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "team_id": "mi", "player_id": "mi_1", "batting_position": 1},
            {"match_id": "csk_last", "team_id": "csk", "player_id": "csk_1", "batting_position": 1},
        ]
    )

    with pytest.raises(InferenceDataError) as excinfo:
        resolve_match_player_pool(
            match_row=match_row,
            compositions_df=pd.DataFrame(),
            matches_df=matches_df,
            stats_df=stats_df,
        )

    assert excinfo.value.code == "insufficient_player_pool"
    assert excinfo.value.message


def test_resolve_match_player_pool_falls_back_when_compositions_are_partial():
    match_row = {"match_id": "future_3", "match_date": "2026-04-10", "team1_id": "mi", "team2_id": "csk"}
    compositions_df = pd.DataFrame(
        [
            {"match_id": "future_3", "team_id": "mi", "player_id": "a1", "batting_order": 1},
            {"match_id": "future_3", "team_id": "mi", "player_id": "a2", "batting_order": 2},
        ]
    )
    matches_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "match_date": "2026-04-01", "team1_id": "mi", "team2_id": "rr", "winner": "mi"},
            {"match_id": "csk_last", "match_date": "2026-04-02", "team1_id": "csk", "team2_id": "gt", "winner": "csk"},
        ]
    )
    stats_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "team_id": "mi", "player_id": f"mi_{idx}", "batting_position": idx}
            for idx in range(1, 12)
        ]
        + [
            {"match_id": "csk_last", "team_id": "csk", "player_id": f"csk_{idx}", "batting_position": idx}
            for idx in range(1, 12)
        ]
    )

    resolved = resolve_match_player_pool(
        match_row=match_row,
        compositions_df=compositions_df,
        matches_df=matches_df,
        stats_df=stats_df,
    )

    assert resolved["source"] == "recent_xi"
    assert {row["player_id"] for row in resolved["rows"]} == {f"mi_{idx}" for idx in range(1, 12)} | {f"csk_{idx}" for idx in range(1, 12)}


def test_resolve_match_player_pool_uses_recent_xi_for_future_match():
    match_row = {"match_id": "future_3", "match_date": "2026-04-10", "team1_id": "mi", "team2_id": "csk"}
    matches_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "match_date": "2026-04-01", "team1_id": "mi", "team2_id": "rr", "winner": "mi"},
            {"match_id": "csk_last", "match_date": "2026-04-02", "team1_id": "csk", "team2_id": "gt", "winner": "csk"},
        ]
    )
    stats_df = pd.DataFrame(
        [
            {"match_id": "mi_last", "team_id": "mi", "player_id": f"mi_{idx}", "batting_position": idx}
            for idx in range(1, 12)
        ]
        + [
            {"match_id": "csk_last", "team_id": "csk", "player_id": f"csk_{idx}", "batting_position": idx}
            for idx in range(1, 12)
        ]
    )

    resolved = resolve_match_player_pool(
        match_row=match_row,
        compositions_df=pd.DataFrame(),
        matches_df=matches_df,
        stats_df=stats_df,
    )

    assert resolved["source"] == "recent_xi"
    assert {row["player_id"] for row in resolved["rows"]} == {f"mi_{idx}" for idx in range(1, 12)} | {
        f"csk_{idx}" for idx in range(1, 12)
    }
    assert {row["match_id"] for row in resolved["rows"]} == {"future_3"}


def test_resolve_match_player_pool_normalizes_match_id_before_composition_filter():
    match_row = {"match_id": "200", "match_date": "2026-04-10", "team1_id": "mi", "team2_id": "csk"}
    compositions_df = pd.DataFrame(
        [
            {"match_id": 200, "team_id": "mi", "player_id": f"mi_{idx}", "batting_order": idx}
            for idx in range(1, 12)
        ]
        + [
            {"match_id": 200, "team_id": "csk", "player_id": f"csk_{idx}", "batting_order": idx}
            for idx in range(1, 12)
        ]
    )

    resolved = resolve_match_player_pool(
        match_row=match_row,
        compositions_df=compositions_df,
        matches_df=pd.DataFrame(),
        stats_df=pd.DataFrame(),
    )

    assert resolved["source"] == "team_compositions"
    assert {row["match_id"] for row in resolved["rows"]} == {"200"}
    assert {row["player_id"] for row in resolved["rows"]} == {f"mi_{idx}" for idx in range(1, 12)} | {
        f"csk_{idx}" for idx in range(1, 12)
    }


def test_load_metadata_raises_when_metadata_missing(monkeypatch):
    class MissingPath:
        def exists(self):
            return False

    monkeypatch.setattr(predict_module, "METADATA_PATH", MissingPath())

    with pytest.raises(FileNotFoundError, match="Missing model metadata"):
        predict_module.load_metadata()


def test_load_pipeline_raises_when_artifact_missing(monkeypatch):
    class MissingPath:
        def exists(self):
            return False

    monkeypatch.setattr(predict_module, "MODEL_PATH", MissingPath())

    with pytest.raises(FileNotFoundError, match="Missing model artifact"):
        predict_module.load_pipeline()
