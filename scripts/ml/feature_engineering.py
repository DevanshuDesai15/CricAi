import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

from ml.common import CATEGORICAL_FEATURES, NUMERIC_FEATURES

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")


def create_supabase_client():
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def fetch_all_rows(query, page_size: int = 1000):
    rows = []
    start = 0

    while True:
        batch = query.range(start, start + page_size - 1).execute().data
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size

    return rows


def _to_frame(data):
    if isinstance(data, pd.DataFrame):
        return data.copy()
    return pd.DataFrame(data)


def _normalize_id_series(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip()


def _normalize_player_rows(rows: pd.DataFrame, match_id=None) -> pd.DataFrame:
    frame = rows.copy()
    if "batting_order" not in frame.columns and "batting_position" in frame.columns:
        frame["batting_order"] = frame["batting_position"]
    if match_id is not None and "match_id" not in frame.columns:
        frame["match_id"] = match_id

    for column in ["match_id", "team_id", "player_id", "batting_order"]:
        if column not in frame.columns:
            frame[column] = None

    frame = frame.dropna(subset=["player_id", "team_id"])
    frame["player_id"] = frame["player_id"].astype(str)
    frame["team_id"] = frame["team_id"].astype(str)
    frame["batting_order"] = pd.to_numeric(frame["batting_order"], errors="coerce")
    return frame.sort_values(["batting_order", "player_id"], na_position="last").drop_duplicates(
        subset=["player_id"], keep="first"
    )


class InferenceDataError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def infer_recent_team_xi(team_id: str, target_match_date: str, matches_df: pd.DataFrame, stats_df: pd.DataFrame):
    matches = _to_frame(matches_df)
    stats = _to_frame(stats_df)

    if matches.empty or stats.empty:
        raise InferenceDataError("insufficient_player_pool", f"No recent completed match for team: {team_id}")

    matches["match_date"] = pd.to_datetime(matches.get("match_date"), errors="coerce")
    target_date = pd.to_datetime(target_match_date, errors="coerce")
    if pd.isna(target_date):
        raise InferenceDataError("insufficient_player_pool", f"Invalid target match date for team: {team_id}")

    if "winner" not in matches.columns:
        matches["winner"] = None
    if "team1_id" not in matches.columns:
        matches["team1_id"] = None
    if "team2_id" not in matches.columns:
        matches["team2_id"] = None
    if "match_id" not in matches.columns:
        matches["match_id"] = None

    normalized_team_id = str(team_id).strip()
    matches["team1_id"] = _normalize_id_series(matches["team1_id"])
    matches["team2_id"] = _normalize_id_series(matches["team2_id"])
    matches["winner"] = matches["winner"].where(matches["winner"].isna(), _normalize_id_series(matches["winner"]))
    matches["match_id"] = _normalize_id_series(matches["match_id"])

    completed = matches[
        (
            (matches["team1_id"] == normalized_team_id)
            | (matches["team2_id"] == normalized_team_id)
        )
        & matches["winner"].notna()
        & matches["match_date"].notna()
        & (matches["match_date"] < target_date)
    ].sort_values(["match_date", "match_id"], ascending=[False, False])

    if completed.empty:
        raise InferenceDataError("insufficient_player_pool", f"No recent completed match for team: {team_id}")

    recent_match_id = str(completed.iloc[0]["match_id"]).strip()
    if "match_id" not in stats.columns:
        stats["match_id"] = None
    if "team_id" not in stats.columns:
        stats["team_id"] = None
    stats["team_id"] = _normalize_id_series(stats["team_id"])
    stats["match_id"] = _normalize_id_series(stats["match_id"])
    team_rows = stats[
        (stats["match_id"] == recent_match_id)
        & (stats["team_id"] == normalized_team_id)
    ].copy()

    team_rows = _normalize_player_rows(team_rows)
    if len(team_rows) < 11:
        raise InferenceDataError("insufficient_player_pool", f"No players found for recent match: {recent_match_id}")

    team_rows = team_rows.iloc[:11]
    return [
        {
            "match_id": None,
            "team_id": row["team_id"],
            "player_id": row["player_id"],
            "batting_order": row.get("batting_order"),
        }
        for _, row in team_rows.iterrows()
    ]


def resolve_match_player_pool(match_row: dict, compositions_df: pd.DataFrame, matches_df: pd.DataFrame, stats_df: pd.DataFrame):
    compositions = _to_frame(compositions_df)
    match_id = str(match_row["match_id"]).strip()
    match_row = {**match_row, "match_id": match_id}
    if not compositions.empty and "match_id" in compositions.columns:
        direct = compositions.copy()
        direct["match_id"] = _normalize_id_series(direct["match_id"])
        direct = direct[direct["match_id"] == match_id].copy()
    else:
        direct = pd.DataFrame()

    if not direct.empty:
        direct = _normalize_player_rows(direct, match_id=match_id)
        target_teams = {str(match_row["team1_id"]).strip(), str(match_row["team2_id"]).strip()}
        present_teams = set(_normalize_id_series(direct["team_id"]).unique())
        team_counts = direct.groupby(_normalize_id_series(direct["team_id"])).size()

        if target_teams.issubset(present_teams) and all(team_counts.get(team_id, 0) >= 11 for team_id in target_teams):
            return {
                "source": "team_compositions",
                "rows": direct[["match_id", "team_id", "player_id", "batting_order"]].to_dict(orient="records"),
            }

    team1_rows = infer_recent_team_xi(match_row["team1_id"], match_row["match_date"], matches_df, stats_df)
    team2_rows = infer_recent_team_xi(match_row["team2_id"], match_row["match_date"], matches_df, stats_df)
    rows = team1_rows + team2_rows
    for row in rows:
        row["match_id"] = match_id

    return {"source": "recent_xi", "rows": rows}


def finalize_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    frame = df.copy()

    for col in NUMERIC_FEATURES:
        if col not in frame.columns:
            frame[col] = 0
        frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0)

    for col in CATEGORICAL_FEATURES:
        if col not in frame.columns:
            frame[col] = "unknown"
        frame[col] = frame[col].fillna("unknown").astype(str)

    frame["season"] = pd.to_numeric(frame["season"], errors="coerce").fillna(0).astype(int)

    ordered = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    extras = [col for col in frame.columns if col not in ordered]
    return frame[ordered + extras]


def add_historical_context_features(df: pd.DataFrame) -> pd.DataFrame:
    history = df.copy()
    history["match_date"] = pd.to_datetime(history["match_date"])
    history = history.sort_values(["player_id", "match_date", "match_id"]).reset_index(drop=True)

    history["opposition_team_id"] = history.apply(
        lambda row: row["team2_id"] if row["team1_id"] == row["team_id"] else row["team1_id"],
        axis=1,
    )

    history["avg_fantasy_points_at_venue"] = (
        history.groupby(["player_id", "venue_id"])["fantasy_points"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["avg_runs_at_venue"] = (
        history.groupby(["player_id", "venue_id"])["runs"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["avg_wickets_at_venue"] = (
        history.groupby(["player_id", "venue_id"])["wickets"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["avg_economy_at_venue"] = (
        history.groupby(["player_id", "venue_id"])["economy"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["matches_at_venue"] = history.groupby(["player_id", "venue_id"]).cumcount()

    history["avg_fantasy_points_vs_opposition"] = (
        history.groupby(["player_id", "opposition_team_id"])["fantasy_points"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["avg_runs_vs_opposition"] = (
        history.groupby(["player_id", "opposition_team_id"])["runs"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["avg_wickets_vs_opposition"] = (
        history.groupby(["player_id", "opposition_team_id"])["wickets"]
        .transform(lambda series: series.shift(1).expanding().mean())
    )
    history["matches_vs_opposition"] = history.groupby(["player_id", "opposition_team_id"]).cumcount()

    return finalize_feature_frame(history)


def _view_frame(rows, rename_map=None):
    frame = pd.DataFrame(rows)
    if frame.empty:
        return frame
    if rename_map:
        frame = frame.rename(columns=rename_map)
    return frame


def build_historical_training_frame(league_id: str = "ipl") -> pd.DataFrame:
    supabase = create_supabase_client()

    pms_rows = fetch_all_rows(
        supabase.table("player_match_stats")
        .select("player_id,match_id,team_id,batting_position,runs,wickets,economy,fantasy_points")
    )
    match_rows = fetch_all_rows(
        supabase.table("matches")
        .select("match_id,league_id,season,match_date,venue_id,team1_id,team2_id")
        .eq("league_id", league_id)
    )
    player_rows = fetch_all_rows(
        supabase.table("players").select("player_id,name,primary_role")
    )
    recent_rows = fetch_all_rows(
        supabase.table("player_recent_form")
        .select("player_id,match_id,avg_fantasy_points_last5,avg_runs_last5,avg_wickets_last5,avg_economy_last5,matches_in_window")
        .eq("league_id", league_id)
    )

    pms_df = pd.DataFrame(pms_rows)
    matches_df = pd.DataFrame(match_rows)
    players_df = pd.DataFrame(player_rows)
    recent_df = pd.DataFrame(recent_rows)

    if pms_df.empty or matches_df.empty:
        raise RuntimeError("Historical training data is empty")

    base = pms_df.merge(matches_df, on="match_id", how="inner")
    base = base.merge(players_df[["player_id", "name", "primary_role"]], on="player_id", how="left")

    if not recent_df.empty:
        base = base.merge(
            recent_df[
                [
                    "player_id",
                    "match_id",
                    "avg_fantasy_points_last5",
                    "avg_runs_last5",
                    "avg_wickets_last5",
                    "avg_economy_last5",
                    "matches_in_window",
                ]
            ],
            on=["player_id", "match_id"],
            how="left",
        )

    base["role"] = base["primary_role"].fillna("unknown")
    base["is_home"] = 0

    return add_historical_context_features(base)


def build_match_inference_frame(match_id: str, league_id: str = "ipl") -> pd.DataFrame:
    supabase = create_supabase_client()

    match_rows = fetch_all_rows(
        supabase.table("matches")
        .select("match_id,season,match_date,venue_id,team1_id,team2_id,winner")
        .eq("match_id", match_id)
    )
    composition_rows = fetch_all_rows(
        supabase.table("team_compositions")
        .select("match_id,team_id,player_id,batting_order")
        .eq("match_id", match_id)
    )
    all_match_rows = fetch_all_rows(
        supabase.table("matches")
        .select("match_id,match_date,team1_id,team2_id,winner")
        .eq("league_id", league_id)
    )
    stats_rows = fetch_all_rows(
        supabase.table("player_match_stats")
        .select("match_id,team_id,player_id,batting_position")
    )
    player_rows = fetch_all_rows(
        supabase.table("players").select("player_id,name,primary_role")
    )
    recent_rows = fetch_all_rows(
        supabase.table("player_recent_form")
        .select("player_id,match_date,avg_fantasy_points_last5,avg_runs_last5,avg_wickets_last5,avg_economy_last5,matches_in_window")
        .eq("league_id", league_id)
    )
    venue_rows = fetch_all_rows(
        supabase.table("player_venue_stats")
        .select("player_id,venue_id,league_id,matches_played,avg_runs,avg_wickets,avg_economy,avg_fantasy_points")
        .eq("league_id", league_id)
    )
    h2h_rows = fetch_all_rows(
        supabase.table("head_to_head_stats")
        .select("player_id,player_team_id,opposition_team_id,league_id,matches_played,avg_runs,avg_wickets,avg_fantasy_points")
        .eq("league_id", league_id)
    )

    if not match_rows:
        raise InferenceDataError("match_not_found", f"Match not found: {match_id}")

    match_row = match_rows[0]
    resolved_pool = resolve_match_player_pool(
        match_row=match_row,
        compositions_df=pd.DataFrame(composition_rows),
        matches_df=pd.DataFrame(all_match_rows),
        stats_df=pd.DataFrame(stats_rows),
    )

    base = pd.DataFrame(resolved_pool["rows"])
    if base.empty:
        raise InferenceDataError("insufficient_player_pool", f"No player pool found for match: {match_id}")

    base = base.merge(pd.DataFrame(player_rows)[["player_id", "name", "primary_role"]], on="player_id", how="left")
    base["league_id"] = league_id
    base["venue_id"] = match_row["venue_id"]
    base["season"] = match_row["season"]
    base["match_date"] = match_row["match_date"]
    base["batting_position"] = base["batting_order"]
    base["role"] = base["primary_role"].fillna("unknown")
    base["is_home"] = 0
    base["opposition_team_id"] = base["team_id"].apply(
        lambda team_id: match_row["team2_id"] if team_id == match_row["team1_id"] else match_row["team1_id"]
    )

    recent_df = pd.DataFrame(recent_rows)
    if not recent_df.empty:
        recent_df["match_date"] = pd.to_datetime(recent_df["match_date"])
        recent_df = recent_df.sort_values("match_date").drop_duplicates(["player_id"], keep="last")
        base = base.merge(
            recent_df[
                [
                    "player_id",
                    "avg_fantasy_points_last5",
                    "avg_runs_last5",
                    "avg_wickets_last5",
                    "avg_economy_last5",
                    "matches_in_window",
                ]
            ],
            on="player_id",
            how="left",
        )

    venue_df = _view_frame(
        venue_rows,
        rename_map={
            "matches_played": "matches_at_venue",
            "avg_runs": "avg_runs_at_venue",
            "avg_wickets": "avg_wickets_at_venue",
            "avg_economy": "avg_economy_at_venue",
            "avg_fantasy_points": "avg_fantasy_points_at_venue",
        },
    )
    if not venue_df.empty:
        base = base.merge(
            venue_df[
                [
                    "player_id",
                    "venue_id",
                    "league_id",
                    "matches_at_venue",
                    "avg_runs_at_venue",
                    "avg_wickets_at_venue",
                    "avg_economy_at_venue",
                    "avg_fantasy_points_at_venue",
                ]
            ],
            on=["player_id", "venue_id", "league_id"],
            how="left",
        )

    h2h_df = _view_frame(
        h2h_rows,
        rename_map={
            "matches_played": "matches_vs_opposition",
            "avg_runs": "avg_runs_vs_opposition",
            "avg_wickets": "avg_wickets_vs_opposition",
            "avg_fantasy_points": "avg_fantasy_points_vs_opposition",
        },
    )
    if not h2h_df.empty:
        base = base.merge(
            h2h_df[
                [
                    "player_id",
                    "player_team_id",
                    "opposition_team_id",
                    "league_id",
                    "matches_vs_opposition",
                    "avg_runs_vs_opposition",
                    "avg_wickets_vs_opposition",
                    "avg_fantasy_points_vs_opposition",
                ]
            ],
            left_on=["player_id", "team_id", "opposition_team_id", "league_id"],
            right_on=["player_id", "player_team_id", "opposition_team_id", "league_id"],
            how="left",
        )

    return finalize_feature_frame(base)
