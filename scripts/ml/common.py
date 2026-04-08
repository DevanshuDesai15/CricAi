from pathlib import Path

ARTIFACT_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "fantasy_points_baseline.joblib"
METADATA_PATH = ARTIFACT_DIR / "fantasy_points_baseline.metadata.json"

NUMERIC_FEATURES = [
    "avg_fantasy_points_last5",
    "avg_runs_last5",
    "avg_wickets_last5",
    "avg_economy_last5",
    "matches_in_window",
    "avg_fantasy_points_at_venue",
    "avg_runs_at_venue",
    "avg_wickets_at_venue",
    "avg_economy_at_venue",
    "matches_at_venue",
    "avg_fantasy_points_vs_opposition",
    "avg_runs_vs_opposition",
    "avg_wickets_vs_opposition",
    "matches_vs_opposition",
    "batting_position",
    "is_home",
    "season",
]

CATEGORICAL_FEATURES = [
    "player_id",
    "team_id",
    "opposition_team_id",
    "venue_id",
    "role",
]

TARGET_COLUMN = "fantasy_points"
TEST_SEASON = "2025"
TRAIN_SEASON_MAX = "2024"
