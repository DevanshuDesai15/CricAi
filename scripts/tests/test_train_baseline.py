import pandas as pd

from ml.common import CATEGORICAL_FEATURES, NUMERIC_FEATURES
from ml.train import split_train_test, build_preprocessor, train_and_evaluate_frame


def test_split_train_test_uses_time_based_seasons():
    df = pd.DataFrame(
        [
            {"season": "2024", "fantasy_points": 40},
            {"season": "2025", "fantasy_points": 55},
            {"season": "2023", "fantasy_points": 30},
        ]
    )

    train_df, test_df = split_train_test(df)

    assert set(train_df["season"].astype(str)) == {"2023", "2024"}
    assert set(test_df["season"].astype(str)) == {"2025"}


def test_build_preprocessor_returns_column_transformer():
    preprocessor = build_preprocessor()
    assert preprocessor is not None
    assert hasattr(preprocessor, "fit")


def test_train_and_evaluate_frame_returns_metrics_and_pipeline():
    rows = []
    for season, offset in [("2024", 0), ("2025", 10)]:
        for idx in range(6):
            row = {
                "fantasy_points": float(idx + offset + 20),
            }
            for col in CATEGORICAL_FEATURES:
                row[col] = f"{col}_{idx % 2}"
            for col in NUMERIC_FEATURES:
                row[col] = float(idx + 1)
            row["season"] = season
            rows.append(row)

    df = pd.DataFrame(rows)

    result = train_and_evaluate_frame(df)

    assert "pipeline" in result
    assert result["train_rows"] == 6
    assert result["test_rows"] == 6
    assert set(result["metrics"]) == {"mae", "rmse"}
