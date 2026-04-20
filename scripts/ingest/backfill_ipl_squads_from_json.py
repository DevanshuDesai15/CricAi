"""
One-off backfill of IPL squad metadata from a local JSON export into Supabase.

Usage:
  python backfill_ipl_squads_from_json.py
  python backfill_ipl_squads_from_json.py --file ../../IPLsquad.json --dry-run

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parse_ipl_squad_json import DEFAULT_SOURCE, parse_ipl_squad_payload

ROOT_DIR = Path(__file__).parent.parent.parent


def chunked(rows: list[dict], size: int) -> list[list[dict]]:
    return [rows[i : i + size] for i in range(0, len(rows), size)]


def load_payload(file_path: Path) -> dict:
    return json.loads(file_path.read_text())


def get_squad_id(supabase, source: str, team_name: str) -> int:
    response = (
        supabase.table("external_team_squads")
        .select("id")
        .eq("source", source)
        .eq("team_name", team_name)
        .single()
        .execute()
    )
    return response.data["id"]


def backfill(file_path: Path, dry_run: bool = False, source: str = DEFAULT_SOURCE) -> None:
    payload = load_payload(file_path)
    parsed = parse_ipl_squad_payload(payload, source=source)

    print(f"[backfill] Loaded {len(parsed['teams'])} teams and {len(parsed['players'])} players from {file_path.name}")

    if dry_run:
        for team in parsed["teams"]:
            player_count = len([p for p in parsed["players"] if p["team_name"] == team["team_name"]])
            print(f"[backfill] DRY RUN team={team['team_name']} players={player_count}")
        return

    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv(Path(__file__).parent.parent.parent / ".env.local")
    supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(supabase_url, supabase_key)

    for team in parsed["teams"]:
        team_name = team["team_name"]
        team_players = [p for p in parsed["players"] if p["team_name"] == team_name]

        supabase.table("external_team_squads").upsert(
            team,
            on_conflict="source,team_name",
        ).execute()

        squad_id = get_squad_id(supabase, source, team_name)

        (
            supabase.table("external_team_squad_players")
            .delete()
            .eq("squad_id", squad_id)
            .execute()
        )

        rows = [{**player, "squad_id": squad_id} for player in team_players]
        for batch in chunked(rows, 100):
            (
                supabase.table("external_team_squad_players")
                .insert(batch)
                .execute()
            )

        print(f"[backfill] Imported {team_name}: {len(rows)} players")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--file",
        type=Path,
        default=ROOT_DIR / "IPLsquad.json",
        help="Path to the IPL squad JSON export",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--source", default=DEFAULT_SOURCE)
    args = parser.parse_args()

    backfill(args.file, dry_run=args.dry_run, source=args.source)
