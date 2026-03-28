"""
Seeds the players table from Cricsheet people.csv.
Uses the Cricsheet `identifier` as the canonical player_id.

Usage: python seed_players.py
Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (project root)
"""
import os
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATA_DIR = Path(__file__).parent.parent / "data"

BATCH_SIZE = 500

def build_player_row(row: pd.Series) -> dict:
    """Build a player row from a people.csv record."""
    return {
        "player_id":     row["identifier"],
        "cricsheet_key": row["identifier"],
        "name":          row["name"],
        "full_name":     row["unique_name"] if pd.notna(row.get("unique_name", float("nan"))) else None,
    }

def seed(supabase: Client) -> None:
    """Load players from people.csv and upsert to Supabase."""
    df = pd.read_csv(DATA_DIR / "people.csv")
    print(f"Loaded {len(df)} players from people.csv")

    rows = [build_player_row(r) for _, r in df.iterrows()]

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("players").upsert(batch, on_conflict="player_id").execute()
        print(f"  Upserted players {i + 1}–{min(i + BATCH_SIZE, len(rows))}")

    print("Players seeded.")

if __name__ == "__main__":
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    seed(supabase)
