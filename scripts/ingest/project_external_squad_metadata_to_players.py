"""
One-off projection of reconciled external squad metadata onto canonical players.

Usage:
  python project_external_squad_metadata_to_players.py
  python project_external_squad_metadata_to_players.py --dry-run

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).parent))
from project_external_player_metadata import (
    map_country_to_is_overseas,
    map_external_role_to_fantasy_role,
    map_external_team_to_team_id,
)


load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def load_projectable_rows(supabase) -> list[dict]:
    response = (
        supabase.table("external_team_squad_player_mappings")
        .select(
            "canonical_player_id, "
            "external_team_squad_players!inner(team_name, external_role, country)"
        )
        .execute()
    )
    rows = response.data or []
    projectable = []
    for row in rows:
        external = row.get("external_team_squad_players") or {}
        projectable.append(
            {
                "player_id": row["canonical_player_id"],
                "country": external.get("country"),
                "is_overseas": map_country_to_is_overseas(external.get("country")),
                "fantasy_role": map_external_role_to_fantasy_role(external.get("external_role")),
                "current_team_id": map_external_team_to_team_id(external.get("team_name")),
            }
        )
    return projectable


def dedupe_updates(rows: list[dict]) -> list[dict]:
    # One mapped row per canonical player is expected after the completed reconciliation,
    # but keep last-write-wins semantics in case of duplicates.
    by_player_id = {}
    for row in rows:
        by_player_id[row["player_id"]] = row
    return list(by_player_id.values())


def project(dry_run: bool = False) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = dedupe_updates(load_projectable_rows(supabase))

    print(f"[project] Canonical players to update: {len(rows)}")

    if dry_run:
        for row in rows[:15]:
            print(
                "[project] DRY RUN "
                f"player_id={row['player_id']} "
                f"country={row['country']} "
                f"is_overseas={row['is_overseas']} "
                f"fantasy_role={row['fantasy_role']} "
                f"current_team_id={row['current_team_id']}"
            )
        return

    for row in rows:
        player_id = row["player_id"]
        payload = {
            "country": row["country"],
            "is_overseas": row["is_overseas"],
            "fantasy_role": row["fantasy_role"],
            "current_team_id": row["current_team_id"],
        }
        supabase.table("players").update(payload).eq("player_id", player_id).execute()

    print(f"[project] Updated {len(rows)} canonical players")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    project(dry_run=args.dry_run)
