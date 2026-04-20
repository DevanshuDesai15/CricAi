"""
One-off reconciliation of raw external squad players onto canonical players.

Usage:
  python reconcile_external_squad_players.py
  python reconcile_external_squad_players.py --dry-run

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).parent))
from match_external_players import match_external_player_row
from player_resolver import PlayerResolver


load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def load_external_rows(supabase) -> list[dict]:
    response = (
        supabase.table("external_team_squad_players")
        .select("id, team_name, external_name, external_player_id")
        .order("team_name")
        .order("external_name")
        .execute()
    )
    return response.data or []


def load_canonical_player_rows(supabase) -> list[dict]:
    response = (
        supabase.table("players")
        .select("player_id, name, full_name")
        .execute()
    )
    rows = response.data or []
    return [
        {
            "identifier": row["player_id"],
            "name": row.get("name"),
            "unique_name": row.get("full_name") or row.get("name"),
        }
        for row in rows
        if row.get("player_id")
    ]


def reconcile(dry_run: bool = False) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    resolver = PlayerResolver.from_rows(load_canonical_player_rows(supabase))
    rows = load_external_rows(supabase)

    matched = []
    unmatched = []

    for row in rows:
        mapping = match_external_player_row(row, resolver)
        if mapping is None:
            unmatched.append(row)
        else:
            matched.append(mapping)

    print(f"[reconcile] Loaded {len(rows)} external squad players")
    print(f"[reconcile] Matched {len(matched)} players")
    print(f"[reconcile] Unmatched {len(unmatched)} players")

    if unmatched:
        preview = unmatched[:10]
        for row in preview:
            print(f"[reconcile] UNMATCHED team={row['team_name']} name={row['external_name']}")

    if dry_run or not matched:
        return

    batch_size = 100
    for i in range(0, len(matched), batch_size):
        batch = matched[i : i + batch_size]
        (
            supabase.table("external_team_squad_player_mappings")
            .upsert(batch, on_conflict="external_team_squad_player_id")
            .execute()
        )

    print(f"[reconcile] Upserted {len(matched)} mappings")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    reconcile(dry_run=args.dry_run)
