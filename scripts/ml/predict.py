import argparse
import json
from datetime import datetime, timezone
import sys
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.common import CATEGORICAL_FEATURES, METADATA_PATH, MODEL_PATH, NUMERIC_FEATURES
from ml.feature_engineering import build_match_inference_frame


def rank_predictions(df: pd.DataFrame) -> pd.DataFrame:
    ranked = df.sort_values("predicted_fantasy_points", ascending=False).reset_index(drop=True).copy()
    ranked["rank"] = ranked.index + 1
    return ranked


def predictions_to_response(match_id: str, model_version: str, df: pd.DataFrame) -> dict:
    return {
        "match_id": match_id,
        "model_version": model_version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "predictions": df.to_dict(orient="records"),
    }


def load_metadata():
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Missing model metadata: {METADATA_PATH}")
    return json.loads(METADATA_PATH.read_text())


def load_pipeline():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing model artifact: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def predict_match(match_id: str) -> dict:
    metadata = load_metadata()
    pipeline = load_pipeline()
    frame = build_match_inference_frame(match_id)

    X = frame[CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    result = frame.copy()
    result["predicted_fantasy_points"] = pipeline.predict(X).round(2)

    ranked = rank_predictions(
        result[["player_id", "name", "team_id", "predicted_fantasy_points"]].rename(
            columns={"name": "player_name"}
        )
    )

    return predictions_to_response(match_id, metadata["model_version"], ranked)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--match-id", required=True)
    parser.add_argument("--format", choices=["table", "json"], default="table")
    args = parser.parse_args()

    payload = predict_match(args.match_id)
    if args.format == "json":
        print(json.dumps(payload, indent=2))
        return

    print(f"Match: {payload['match_id']}")
    print(f"Model: {payload['model_version']}")
    for row in payload["predictions"]:
        print(
            f"{row['rank']:>2}. {row['player_name']} "
            f"({row['team_id']}) - {row['predicted_fantasy_points']}"
        )


if __name__ == "__main__":
    main()
