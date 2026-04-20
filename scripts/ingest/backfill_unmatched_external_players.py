"""
One-off backfill of unmatched external squad players into canonical players.

Usage:
  python backfill_unmatched_external_players.py
  python backfill_unmatched_external_players.py --dry-run

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).parent))
from parse_matches import slugify


load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def load_unmatched_external_rows(supabase) -> list[dict]:
    response = (
        supabase.table("external_team_squad_players")
        .select("id, external_name")
        .execute()
    )
    rows = [
        row
        for row in (response.data or [])
        if str(row.get("external_name", "")).strip()
    ]

    mapping_response = (
        supabase.table("external_team_squad_player_mappings")
        .select("external_team_squad_player_id")
        .execute()
    )
    mapped_ids = {
        row["external_team_squad_player_id"]
        for row in (mapping_response.data or [])
        if row.get("external_team_squad_player_id") is not None
    }
    return [row for row in rows if row["id"] not in mapped_ids]


def load_existing_player_ids(supabase) -> set[str]:
    response = supabase.table("players").select("player_id").execute()
    return {row["player_id"] for row in (response.data or []) if row.get("player_id")}


def build_missing_player_rows(external_rows: list[dict], existing_player_ids: set[str]) -> list[dict]:
    rows = []
    seen_ids = set(existing_player_ids)

    for row in external_rows:
        external_name = str(row.get("external_name", "")).strip()
        if not external_name:
            continue

        player_id = slugify(external_name)
        if not player_id or player_id in seen_ids:
            continue

        rows.append(
            {
                "player_id": player_id,
                "name": external_name,
                "full_name": external_name,
            }
        )
        seen_ids.add(player_id)

    return rows


def backfill(dry_run: bool = False) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    external_rows = load_unmatched_external_rows(supabase)
    existing_player_ids = load_existing_player_ids(supabase)
    insert_rows = build_missing_player_rows(external_rows, existing_player_ids)

    print(f"[backfill-unmatched] Unmatched external players: {len(external_rows)}")
    print(f"[backfill-unmatched] New canonical players to insert: {len(insert_rows)}")

    if dry_run:
        for row in insert_rows[:15]:
            print(f"[backfill-unmatched] DRY RUN insert player_id={row['player_id']} name={row['name']}")
        return

    if not insert_rows:
        return

    batch_size = 100
    for i in range(0, len(insert_rows), batch_size):
        batch = insert_rows[i : i + batch_size]
        supabase.table("players").upsert(batch, on_conflict="player_id").execute()

    print(f"[backfill-unmatched] Inserted {len(insert_rows)} canonical players")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    backfill(dry_run=args.dry_run)
