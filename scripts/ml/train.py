import pandas as pd
import json
import joblib
import sys
from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.common import (
    ARTIFACT_DIR,
    CATEGORICAL_FEATURES,
    METADATA_PATH,
    MODEL_PATH,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    TEST_SEASON,
)
from ml.feature_engineering import build_historical_training_frame


def split_train_test(df: pd.DataFrame):
    train_df = df[df["season"].astype(str) < TEST_SEASON].copy()
    test_df = df[df["season"].astype(str) == TEST_SEASON].copy()
    return train_df, test_df


def build_preprocessor():
    return ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="constant", fill_value=0)),
                    ]
                ),
                NUMERIC_FEATURES,
            ),
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="constant", fill_value="unknown")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def train_and_evaluate_frame(df: pd.DataFrame):
    train_df, test_df = split_train_test(df)

    X_train = train_df[CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    y_train = train_df[TARGET_COLUMN]
    X_test = test_df[CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    y_test = test_df[TARGET_COLUMN]

    pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    rmse = mean_squared_error(y_test, preds) ** 0.5

    return {
        "pipeline": pipeline,
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
        },
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
    }


def train_and_evaluate():
    df = build_historical_training_frame()
    return train_and_evaluate_frame(df)


def save_artifacts(result):
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(result["pipeline"], MODEL_PATH)

    metadata = {
        "model_version": "baseline-random-forest-v1",
        "model_type": "RandomForestRegressor",
        "feature_columns": CATEGORICAL_FEATURES + NUMERIC_FEATURES,
        "categorical_columns": CATEGORICAL_FEATURES,
        "numeric_columns": NUMERIC_FEATURES,
        "test_season": TEST_SEASON,
        "metrics": result["metrics"],
        "train_rows": result["train_rows"],
        "test_rows": result["test_rows"],
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    result = train_and_evaluate()
    metadata = save_artifacts(result)
    print(f"Train rows: {result['train_rows']}")
    print(f"Test rows: {result['test_rows']}")
    print(f"MAE: {metadata['metrics']['mae']}")
    print(f"RMSE: {metadata['metrics']['rmse']}")
    print(f"Saved model: {MODEL_PATH}")
