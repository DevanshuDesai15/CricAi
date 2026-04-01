"""
Seeds venues, teams, matches, and player_match_stats from parsed Cricsheet IPL CSVs.

Usage: python seed_matches.py [--limit N]
  --limit N   only process first N match files (useful for testing)

NOTE: Run seed_players.py first. The players table must be populated
      before player_match_stats can reference player_ids.
"""
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

# Add parent to path so we can import parse_matches
sys.path.insert(0, str(Path(__file__).parent))
from parse_matches import parse_match_file

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATA_DIR     = Path(__file__).parent.parent / "data" / "ipl"

def seed(limit=None, season=None) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Only process match data files, not _info files
    files = sorted([f for f in DATA_DIR.glob("*.csv") if "_info" not in f.name])

    if season:
        import pandas as pd
        def _file_season(p):
            try:
                row = pd.read_csv(p, nrows=1)
                return str(row.iloc[0].get("season", ""))
            except Exception:
                return ""
        files = [f for f in files if _file_season(f) == season]
        print(f"Filtered to {len(files)} files for season {season}")

    if limit:
        files = files[:limit]

    print(f"Processing {len(files)} IPL match files...")
    errors = []

    for csv_path in tqdm(files):
        try:
            parsed = parse_match_file(csv_path)
            if not parsed:
                continue

            supabase.table("venues").upsert(parsed["venue"], on_conflict="venue_id").execute()

            for team in parsed["teams"]:
                supabase.table("teams").upsert(team, on_conflict="team_id").execute()

            supabase.table("matches").upsert(parsed["match"], on_conflict="match_id").execute()

            # Auto-insert any players not yet in the players table.
            # Cricsheet match files use player names (e.g. "B Kumar") as identifiers,
            # which may not match the people.csv slugs seeded earlier.
            stats = parsed["player_stats"]
            missing_players = [
                {"player_id": s["player_id"], "name": s["player_id"]}
                for s in stats
                if s.get("player_id")
            ]
            if missing_players:
                supabase.table("players").upsert(
                    missing_players, on_conflict="player_id"
                ).execute()

            for i in range(0, len(stats), 100):
                batch = stats[i : i + 100]
                supabase.table("player_match_stats").upsert(
                    batch, on_conflict="player_id,match_id"
                ).execute()

        except Exception as e:
            errors.append((csv_path.name, str(e)))

    print(f"\nDone. {len(files) - len(errors)} succeeded, {len(errors)} failed.")
    if errors:
        for name, err in errors[:5]:
            print(f"  {name}: {err}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--season", type=str, default=None, help="Only seed matches for this season (e.g. 2025)")
    args = parser.parse_args()
    seed(args.limit, args.season)
