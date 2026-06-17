from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.common import ARTIFACT_DIR, TEST_SEASON
from ml.feature_engineering import create_supabase_client, fetch_all_rows

TEAM_MODEL_PATH = ARTIFACT_DIR / "team_match_classifier.joblib"
TEAM_METADATA_PATH = ARTIFACT_DIR / "team_match_classifier.metadata.json"

TEAM_MODEL_FEATURES = [
    "t1_alltime_wr",
    "t2_alltime_wr",
    "wr_diff",
    "t1_last3yr_wr",
    "t2_last3yr_wr",
    "last3yr_wr_diff",
    "t1_recent_form",
    "t2_recent_form",
    "form_diff",
    "t1_season_form",
    "t2_season_form",
    "season_form_diff",
    "h2h_t1_wr",
    "t1_venue_wr",
    "t2_venue_wr",
    "venue_wr_diff",
    "t1_is_home",
    "t2_is_home",
]

HOME_VENUES = {
    "mumbai_indians": {"wankhede", "wankhede stadium"},
    "chennai_super_kings": {"chepauk", "ma chidambaram stadium"},
    "royal_challengers_bangalore": {"m chinnaswamy stadium", "chinnaswamy"},
    "kolkata_knight_riders": {"eden gardens"},
    "delhi_capitals": {"arun jaitley stadium", "feroz shah kotla"},
    "rajasthan_royals": {"sawai mansingh stadium"},
    "sunrisers_hyderabad": {"rajiv gandhi international cricket stadium"},
    "punjab_kings": {"punjab cricket association is bindra stadium", "mohali"},
    "gujarat_titans": {"narendra modi stadium"},
    "lucknow_super_giants": {"ekana cricket stadium", "brsabv ekana cricket stadium"},
}


def _normalize_team_id(value) -> str:
    return str(value or "").strip()


def _normalize_venue(value) -> str:
    return str(value or "").strip().lower()


def _to_datetime(value):
    return pd.to_datetime(value, errors="coerce")


def _prior_matches(matches_df: pd.DataFrame, match_date: str, match_id: str | None = None) -> pd.DataFrame:
    matches = matches_df.copy()
    matches["match_date"] = pd.to_datetime(matches["match_date"], errors="coerce")
    target_date = _to_datetime(match_date)
    prior = matches[
        matches["winner"].notna()
        & matches["team1_id"].notna()
        & matches["team2_id"].notna()
        & matches["match_date"].notna()
        & (matches["match_date"] < target_date)
    ].copy()
    if match_id is not None:
        prior = prior[prior["match_id"].astype(str) != str(match_id)]
    return prior.sort_values(["match_date", "match_id"])


def _smoothed_win_rate(matches: pd.DataFrame, team_id: str, prior_weight: int = 4) -> float:
    team_id = _normalize_team_id(team_id)
    played = matches[(matches["team1_id"] == team_id) | (matches["team2_id"] == team_id)]
    wins = played[played["winner"] == team_id]
    return (len(wins) + prior_weight * 0.5) / (len(played) + prior_weight)


def _last_n_seasons_wr(matches: pd.DataFrame, team_id: str, season: str, n_seasons: int = 3) -> float:
    season_num = pd.to_numeric(pd.Series([season]), errors="coerce").iloc[0]
    if pd.isna(season_num):
        return 0.5

    frame = matches.copy()
    frame["season_num"] = pd.to_numeric(frame["season"], errors="coerce")
    relevant = frame[
        (frame["season_num"] < int(season_num))
        & ((frame["team1_id"] == team_id) | (frame["team2_id"] == team_id))
    ]
    if relevant.empty:
        return 0.5

    seasons = sorted(relevant["season_num"].dropna().unique())[-n_seasons:]
    return _smoothed_win_rate(relevant[relevant["season_num"].isin(seasons)], team_id)


def _recent_form(matches: pd.DataFrame, team_id: str, window: int = 5) -> float:
    played = matches[(matches["team1_id"] == team_id) | (matches["team2_id"] == team_id)].tail(window)
    if played.empty:
        return 0.5
    return len(played[played["winner"] == team_id]) / len(played)


def _season_form(matches: pd.DataFrame, team_id: str, season: str) -> float:
    season_matches = matches[matches["season"].astype(str) == str(season)]
    played = season_matches[
        (season_matches["team1_id"] == team_id) | (season_matches["team2_id"] == team_id)
    ]
    if played.empty:
        return 0.5
    return len(played[played["winner"] == team_id]) / len(played)


def _h2h_rate(matches: pd.DataFrame, team1_id: str, team2_id: str) -> float:
    h2h = matches[
        ((matches["team1_id"] == team1_id) & (matches["team2_id"] == team2_id))
        | ((matches["team1_id"] == team2_id) & (matches["team2_id"] == team1_id))
    ]
    if h2h.empty:
        return 0.5
    return len(h2h[h2h["winner"] == team1_id]) / len(h2h)


def _venue_win_rate(matches: pd.DataFrame, team_id: str, venue_id: str | None) -> float:
    venue = _normalize_venue(venue_id)
    if not venue:
        return 0.5
    at_venue = matches[
        (matches["venue_id"].fillna("").astype(str).str.lower() == venue)
        & ((matches["team1_id"] == team_id) | (matches["team2_id"] == team_id))
    ]
    if at_venue.empty:
        return 0.5
    return len(at_venue[at_venue["winner"] == team_id]) / len(at_venue)


def _is_home(team_id: str, venue_id: str | None) -> int:
    venue = _normalize_venue(venue_id)
    return int(any(home in venue for home in HOME_VENUES.get(team_id, set())))


def build_matchup_feature_row(
    matches_df: pd.DataFrame,
    match_id: str,
    season: str,
    match_date: str,
    venue_id: str | None,
    team1_id: str,
    team2_id: str,
    winner: str | None = None,
) -> dict:
    team1_id = _normalize_team_id(team1_id)
    team2_id = _normalize_team_id(team2_id)
    prior = _prior_matches(matches_df, match_date=match_date, match_id=match_id)

    t1_alltime = _smoothed_win_rate(prior, team1_id)
    t2_alltime = _smoothed_win_rate(prior, team2_id)
    t1_last3 = _last_n_seasons_wr(prior, team1_id, season)
    t2_last3 = _last_n_seasons_wr(prior, team2_id, season)
    t1_form = _recent_form(prior, team1_id)
    t2_form = _recent_form(prior, team2_id)
    t1_season = _season_form(prior, team1_id, season)
    t2_season = _season_form(prior, team2_id, season)
    t1_venue = _venue_win_rate(prior, team1_id, venue_id)
    t2_venue = _venue_win_rate(prior, team2_id, venue_id)

    row = {
        "match_id": match_id,
        "season": str(season),
        "match_date": match_date,
        "venue_id": venue_id,
        "team1_id": team1_id,
        "team2_id": team2_id,
        "t1_alltime_wr": t1_alltime,
        "t2_alltime_wr": t2_alltime,
        "wr_diff": t1_alltime - t2_alltime,
        "t1_last3yr_wr": t1_last3,
        "t2_last3yr_wr": t2_last3,
        "last3yr_wr_diff": t1_last3 - t2_last3,
        "t1_recent_form": t1_form,
        "t2_recent_form": t2_form,
        "form_diff": t1_form - t2_form,
        "t1_season_form": t1_season,
        "t2_season_form": t2_season,
        "season_form_diff": t1_season - t2_season,
        "h2h_t1_wr": _h2h_rate(prior, team1_id, team2_id),
        "t1_venue_wr": t1_venue,
        "t2_venue_wr": t2_venue,
        "venue_wr_diff": t1_venue - t2_venue,
        "t1_is_home": _is_home(team1_id, venue_id),
        "t2_is_home": _is_home(team2_id, venue_id),
        "target_team1_win": None if winner is None else int(winner == team1_id),
    }
    return row


def build_team_training_frame(matches_df: pd.DataFrame) -> pd.DataFrame:
    required = ["match_id", "season", "match_date", "venue_id", "team1_id", "team2_id", "winner"]
    frame = matches_df.copy()
    for column in required:
        if column not in frame.columns:
            frame[column] = None

    frame = frame.dropna(subset=["match_id", "season", "match_date", "team1_id", "team2_id", "winner"])
    frame = frame.sort_values(["match_date", "match_id"]).reset_index(drop=True)
    rows = [
        build_matchup_feature_row(
            matches_df=frame,
            match_id=row["match_id"],
            season=row["season"],
            match_date=row["match_date"],
            venue_id=row.get("venue_id"),
            team1_id=row["team1_id"],
            team2_id=row["team2_id"],
            winner=row["winner"],
        )
        for _, row in frame.iterrows()
    ]
    return pd.DataFrame(rows)


def _split_train_test(frame: pd.DataFrame):
    train_df = frame[frame["season"].astype(str) < TEST_SEASON].copy()
    test_df = frame[frame["season"].astype(str) == TEST_SEASON].copy()
    if train_df.empty or test_df.empty:
        seasons = sorted(frame["season"].astype(str).unique())
        test_season = seasons[-1]
        train_df = frame[frame["season"].astype(str) != test_season].copy()
        test_df = frame[frame["season"].astype(str) == test_season].copy()
    if train_df.empty or test_df.empty:
        split_at = max(1, int(len(frame) * 0.8))
        train_df = frame.iloc[:split_at].copy()
        test_df = frame.iloc[split_at:].copy()
    return train_df, test_df


def _build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value=0)),
            ("scaler", StandardScaler()),
            (
                "model",
                GradientBoostingClassifier(
                    random_state=42,
                ),
            ),
        ]
    )


def _positive_class_probability(pipeline, feature_frame: pd.DataFrame) -> float:
    probabilities = pipeline.predict_proba(feature_frame[TEAM_MODEL_FEATURES])
    classes = list(pipeline.named_steps["model"].classes_)
    if 1 not in classes:
        return 0.5
    return float(probabilities[:, classes.index(1)][0])


def train_team_model_frame(frame: pd.DataFrame):
    train_df, test_df = _split_train_test(frame)
    pipeline = _build_pipeline()

    pipeline.fit(train_df[TEAM_MODEL_FEATURES], train_df["target_team1_win"].astype(int))
    preds = pipeline.predict(test_df[TEAM_MODEL_FEATURES])
    proba = pipeline.predict_proba(test_df[TEAM_MODEL_FEATURES])
    classes = list(pipeline.named_steps["model"].classes_)
    if len(classes) == 2:
      loss = log_loss(test_df["target_team1_win"].astype(int), proba, labels=[0, 1])
    else:
      loss = 0.0

    final_pipeline = _build_pipeline()
    final_pipeline.fit(frame[TEAM_MODEL_FEATURES], frame["target_team1_win"].astype(int))

    return {
        "pipeline": final_pipeline,
        "metrics": {
            "accuracy": round(float(accuracy_score(test_df["target_team1_win"].astype(int), preds)), 4),
            "log_loss": round(float(loss), 4),
        },
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "fit_rows": int(len(frame)),
    }


def fetch_match_rows(league_id: str = "ipl") -> list[dict]:
    supabase = create_supabase_client()
    return fetch_all_rows(
        supabase.table("matches")
        .select("match_id,season,match_date,venue_id,team1_id,team2_id,winner")
        .eq("league_id", league_id)
    )


def train_and_evaluate(league_id: str = "ipl"):
    frame = build_team_training_frame(pd.DataFrame(fetch_match_rows(league_id)))
    if frame.empty:
        raise RuntimeError("Team match training data is empty")
    return train_team_model_frame(frame)


def save_artifacts(result, version: str = "team-match-gradient-boosting-v1"):
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(result["pipeline"], TEAM_MODEL_PATH)
    metadata = {
        "model_version": version,
        "model_type": "GradientBoostingClassifier",
        "feature_columns": TEAM_MODEL_FEATURES,
        "metrics": result["metrics"],
        "train_rows": result["train_rows"],
        "test_rows": result["test_rows"],
        "fit_rows": result["fit_rows"],
        "test_season": TEST_SEASON,
    }
    TEAM_METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    return metadata


def load_pipeline():
    if not TEAM_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing team model artifact: {TEAM_MODEL_PATH}")
    return joblib.load(TEAM_MODEL_PATH)


def load_metadata():
    if not TEAM_METADATA_PATH.exists():
        raise FileNotFoundError(f"Missing team model metadata: {TEAM_METADATA_PATH}")
    return json.loads(TEAM_METADATA_PATH.read_text())


def prediction_to_response(
    match_id: str,
    model_version: str,
    team1_id: str,
    team2_id: str,
    team1_probability: float,
) -> dict:
    team1_percent = int(round(max(0.0, min(1.0, team1_probability)) * 100))
    team2_percent = 100 - team1_percent
    favorite_team_id = team1_id if team1_percent >= team2_percent else team2_id
    return {
        "match_id": match_id,
        "model_version": model_version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "team1_id": team1_id,
        "team2_id": team2_id,
        "team1_probability": team1_percent,
        "team2_probability": team2_percent,
        "favorite_team_id": favorite_team_id,
        "confidence": max(team1_percent, team2_percent),
        "source": "team_match_classifier",
    }


def build_completed_match_audit_row(
    match_row: dict,
    model_version: str,
    team1_probability: float,
    generated_at: str,
    prediction_source: str = "team_match_classifier_backfill",
) -> dict:
    payload = prediction_to_response(
        match_id=str(match_row["match_id"]),
        model_version=model_version,
        team1_id=str(match_row["team1_id"]),
        team2_id=str(match_row["team2_id"]),
        team1_probability=team1_probability,
    )
    actual_winner = str(match_row["winner"])

    return {
        "match_id": payload["match_id"],
        "model_version": payload["model_version"],
        "team1_id": payload["team1_id"],
        "team2_id": payload["team2_id"],
        "team1_probability": payload["team1_probability"],
        "team2_probability": payload["team2_probability"],
        "favorite_team_id": payload["favorite_team_id"],
        "confidence": payload["confidence"],
        "prediction_source": prediction_source,
        "generated_at": generated_at,
        "actual_winner": actual_winner,
        "was_correct": payload["favorite_team_id"] == actual_winner,
        "resolved_at": generated_at,
        "updated_at": generated_at,
    }


def predict_match(match_id: str, league_id: str = "ipl") -> dict:
    metadata = load_metadata()
    pipeline = load_pipeline()
    match_rows = fetch_match_rows(league_id)
    matches_df = pd.DataFrame(match_rows)
    match = matches_df[matches_df["match_id"].astype(str) == str(match_id)]
    if match.empty:
        raise RuntimeError(f"Match not found: {match_id}")
    row = match.iloc[0].to_dict()
    features = pd.DataFrame([
        build_matchup_feature_row(
            matches_df=matches_df,
            match_id=row["match_id"],
            season=row["season"],
            match_date=row["match_date"],
            venue_id=row.get("venue_id"),
            team1_id=row["team1_id"],
            team2_id=row["team2_id"],
        )
    ])
    team1_probability = _positive_class_probability(pipeline, features)
    return prediction_to_response(
        match_id=match_id,
        model_version=metadata["model_version"],
        team1_id=row["team1_id"],
        team2_id=row["team2_id"],
        team1_probability=team1_probability,
    )


def backfill_completed_match_audits(limit: int = 4, league_id: str = "ipl") -> list[dict]:
    metadata = load_metadata()
    pipeline = load_pipeline()
    supabase = create_supabase_client()
    match_rows = fetch_match_rows(league_id)
    matches_df = pd.DataFrame(match_rows)
    if matches_df.empty:
        return []

    completed = matches_df[
        matches_df["winner"].notna()
        & matches_df["team1_id"].notna()
        & matches_df["team2_id"].notna()
        & matches_df["match_date"].notna()
    ].sort_values(["match_date", "match_id"], ascending=[False, False]).head(limit)

    generated_at = datetime.now(timezone.utc).isoformat()
    audit_rows = []
    for _, row in completed.iterrows():
        row_dict = row.to_dict()
        features = pd.DataFrame([
            build_matchup_feature_row(
                matches_df=matches_df,
                match_id=row_dict["match_id"],
                season=row_dict["season"],
                match_date=row_dict["match_date"],
                venue_id=row_dict.get("venue_id"),
                team1_id=row_dict["team1_id"],
                team2_id=row_dict["team2_id"],
            )
        ])
        team1_probability = _positive_class_probability(pipeline, features)
        audit_rows.append(build_completed_match_audit_row(
            row_dict,
            model_version=metadata["model_version"],
            team1_probability=team1_probability,
            generated_at=generated_at,
        ))

    if not audit_rows:
        return []

    response = supabase.table("team_match_prediction_audits").upsert(
        audit_rows,
        on_conflict="match_id,model_version,prediction_source",
    ).execute()
    return response.data or audit_rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--backfill-audits", action="store_true")
    parser.add_argument("--limit", type=int, default=4)
    parser.add_argument("--match-id")
    parser.add_argument("--league-id", default="ipl")
    parser.add_argument("--format", choices=["table", "json"], default="table")
    args = parser.parse_args()

    if args.train:
        result = train_and_evaluate(args.league_id)
        metadata = save_artifacts(result)
        print(json.dumps(metadata, indent=2))
        return

    if args.backfill_audits:
        rows = backfill_completed_match_audits(limit=args.limit, league_id=args.league_id)
        if args.format == "json":
            print(json.dumps({"inserted": len(rows), "rows": rows}, indent=2))
            return
        print(f"Backfilled {len(rows)} team match prediction audit rows")
        for row in rows:
            print(
                f"{row['match_id']}: predicted {row['favorite_team_id']}, "
                f"actual {row['actual_winner']}, correct={row['was_correct']}"
            )
        return

    if not args.match_id:
        parser.error("--match-id is required unless --train or --backfill-audits is provided")

    payload = predict_match(args.match_id, args.league_id)
    if args.format == "json":
        print(json.dumps(payload, indent=2))
        return

    print(f"Match: {payload['match_id']}")
    print(f"Model: {payload['model_version']}")
    print(f"{payload['team1_id']}: {payload['team1_probability']}%")
    print(f"{payload['team2_id']}: {payload['team2_probability']}%")
    print(f"Favorite: {payload['favorite_team_id']}")


if __name__ == "__main__":
    main()
