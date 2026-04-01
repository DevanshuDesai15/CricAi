"""
Daily sync of IPL 2026 match data from cricketdata.org into Supabase.

Usage:
  python sync_cricketdata.py [--year 2026] [--dry-run]

  --year    IPL season year to sync (default: 2026)
  --dry-run Print what would be synced without writing to DB

Requires env vars: CRICKETDATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).parent))
from cricketdata_client import CricketDataClient
from parse_cricketdata import parse_match

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
API_KEY      = os.environ["CRICKETDATA_API_KEY"]


def get_existing_api_match_ids(supabase, season: str) -> set:
    """Return match_ids already in the DB that start with 'api_' for the given season."""
    res = (
        supabase.table("matches")
        .select("match_id")
        .eq("league_id", "ipl")
        .eq("season", season)
        .like("match_id", "api_%")
        .execute()
    )
    return {r["match_id"] for r in res.data}


def upsert_parsed(supabase, parsed: dict) -> None:
    """Upsert venue, teams, match, players, and player_match_stats from a parsed dict."""
    supabase.table("venues").upsert(parsed["venue"], on_conflict="venue_id").execute()

    for team in parsed["teams"]:
        supabase.table("teams").upsert(team, on_conflict="team_id").execute()

    supabase.table("matches").upsert(parsed["match"], on_conflict="match_id").execute()

    stats = parsed["player_stats"]
    # Auto-create any players not yet in the players table
    missing = [{"player_id": s["player_id"], "name": s["player_id"]} for s in stats if s.get("player_id")]
    if missing:
        supabase.table("players").upsert(missing, on_conflict="player_id").execute()

    for i in range(0, len(stats), 100):
        batch = stats[i : i + 100]
        supabase.table("player_match_stats").upsert(batch, on_conflict="player_id,match_id").execute()


def sync(year: int = 2026, dry_run: bool = False) -> None:
    client   = CricketDataClient(API_KEY)
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    season   = str(year)

    print(f"[sync] Finding IPL {year} series...")
    series_id = client.get_ipl_series_id(year)
    print(f"[sync] Series ID: {series_id}")

    all_matches = client.get_series_matches(series_id)
    completed   = [m for m in all_matches if m.get("matchEnded") is True and m.get("matchType", "").lower() == "t20"]
    print(f"[sync] {len(completed)} completed T20 matches in series (of {len(all_matches)} total)")

    existing_ids = get_existing_api_match_ids(supabase, season)
    new_matches  = [m for m in completed if f"api_{m['id']}" not in existing_ids]
    print(f"[sync] {len(new_matches)} new matches to sync (already have {len(existing_ids)})")

    if not new_matches:
        print("[sync] Nothing to do.")
        return

    succeeded, failed = 0, []

    for m in new_matches:
        mid  = m["id"]
        name = m.get("name", mid)
        print(f"[sync]   Fetching: {name} ... ", end="", flush=True)

        try:
            info      = client.get_match_info(mid)
            scorecard = client.get_match_scorecard(mid)
            parsed    = parse_match(info, scorecard)

            if dry_run:
                print(f"DRY RUN — would insert match {parsed['match']['match_id']} "
                      f"with {len(parsed['player_stats'])} player stat rows")
            else:
                upsert_parsed(supabase, parsed)
                print(f"OK ({len(parsed['player_stats'])} players)")

            succeeded += 1

        except Exception as e:
            print(f"FAILED: {e}")
            failed.append((name, str(e)))

    print(f"\n[sync] Done. {succeeded} synced, {len(failed)} failed.")
    if failed:
        for name, err in failed[:5]:
            print(f"  {name}: {err}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year",    type=int,  default=2026)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sync(args.year, args.dry_run)
