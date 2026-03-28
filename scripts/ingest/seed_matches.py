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

def seed(limit=None) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Only process match data files, not _info files
    files = sorted([f for f in DATA_DIR.glob("*.csv") if "_info" not in f.name])
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

            stats = parsed["player_stats"]
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
    args = parser.parse_args()
    seed(args.limit)
