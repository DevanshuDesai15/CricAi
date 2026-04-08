import pandas as pd

from ml.predict import rank_predictions, predictions_to_response


def test_rank_predictions_orders_descending():
    df = pd.DataFrame(
        [
            {"player_id": "a", "player_name": "A", "team_id": "x", "predicted_fantasy_points": 21.5},
            {"player_id": "b", "player_name": "B", "team_id": "y", "predicted_fantasy_points": 45.0},
        ]
    )

    ranked = rank_predictions(df)

    assert list(ranked["player_id"]) == ["b", "a"]
    assert list(ranked["rank"]) == [1, 2]


def test_predictions_to_response_shapes_payload():
    df = pd.DataFrame(
        [
            {"player_id": "b", "player_name": "B", "team_id": "y", "predicted_fantasy_points": 45.0, "rank": 1},
        ]
    )

    payload = predictions_to_response("match_123", "baseline-v1", df)

    assert payload["match_id"] == "match_123"
    assert payload["model_version"] == "baseline-v1"
    assert payload["predictions"][0]["player_id"] == "b"
