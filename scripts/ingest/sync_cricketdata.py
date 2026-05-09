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
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).parent))
from cricketdata_client import CricketDataClient
from parse_cricketdata import parse_match
from player_resolver import PlayerResolver

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
API_KEY      = os.environ["CRICKETDATA_API_KEY"]
PEOPLE_CSV   = Path(__file__).parent.parent / "data" / "people.csv"


def get_existing_api_match_ids(supabase, season: str) -> set:
    """Return API match IDs that already have synced player stat rows."""
    res = (
        supabase.table("matches")
        .select("match_id,winner,result")
        .eq("league_id", "ipl")
        .eq("season", season)
        .like("match_id", "api_%")
        .execute()
    )
    candidate_ids = []
    for row in res.data:
        result = str(row.get("result") or "")
        is_seeded_placeholder = result.startswith("Match starts")
        is_completed_without_winner = result in {"tie", "no result"}
        if row.get("winner") or (is_completed_without_winner and not is_seeded_placeholder):
            candidate_ids.append(row["match_id"])

    if not candidate_ids:
        return set()

    stats_res = (
        supabase.table("player_match_stats")
        .select("match_id")
        .in_("match_id", candidate_ids)
        .execute()
    )
    return {row["match_id"] for row in stats_res.data}


def build_player_stub_rows(stats: list[dict]) -> list[dict]:
    """Build minimal player rows for every unique stat player ID."""
    rows = []
    seen = set()
    for stat in stats:
        player_id = stat.get("player_id")
        if not player_id or player_id in seen:
            continue
        seen.add(player_id)
        rows.append({
            "player_id": player_id,
            "name": player_id,
            "role": "unknown",
        })
    return rows


def upsert_parsed(supabase, parsed: dict, resolver=None) -> None:
    """Upsert venue, teams, match, players, and player_match_stats from a parsed dict."""
    supabase.table("venues").upsert(parsed["venue"], on_conflict="venue_id").execute()

    for team in parsed["teams"]:
        supabase.table("teams").upsert(team, on_conflict="team_id").execute()

    supabase.table("matches").upsert(parsed["match"], on_conflict="match_id").execute()

    stats = parsed["player_stats"]
    # Only insert rows for players not yet in the DB at all.
    # Use ignoreDuplicates=True so existing rows (which may have fantasy_role,
    # current_team_id, is_overseas etc. from the external squad pipeline) are
    # never clobbered by a bare-minimum stub.
    player_stubs = build_player_stub_rows(stats)
    if player_stubs:
        supabase.table("players").upsert(
            player_stubs,
            on_conflict="player_id",
            ignore_duplicates=True,
        ).execute()
        print(f"  Ensured {len(player_stubs)} player row(s) (existing rows preserved)")

    for i in range(0, len(stats), 100):
        batch = stats[i : i + 100]
        supabase.table("player_match_stats").upsert(batch, on_conflict="player_id,match_id").execute()


def upsert_match_metadata(supabase, parsed: dict) -> None:
    """Upsert match-level data when the scorecard is not available yet."""
    supabase.table("venues").upsert(parsed["venue"], on_conflict="venue_id").execute()

    for team in parsed["teams"]:
        supabase.table("teams").upsert(team, on_conflict="team_id").execute()

    supabase.table("matches").upsert(parsed["match"], on_conflict="match_id").execute()


def _is_completed_and_past(match_row: dict) -> bool:
    if not match_row.get("matchEnded"):
        return False
    if match_row.get("matchType", "").lower() != "t20":
        return False

    match_date_str = match_row.get("date", "")
    try:
        match_date = datetime.strptime(match_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return True

    return match_date <= date.today()


def sync(year: int = 2026, dry_run: bool = False) -> None:
    client   = CricketDataClient(API_KEY)
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    resolver = PlayerResolver.from_csv(PEOPLE_CSV)
    season   = str(year)

    print(f"[sync] Finding IPL {year} series...")
    series_id = client.get_ipl_series_id(year)
    print(f"[sync] Series ID: {series_id}")

    all_matches = client.get_series_matches(series_id)
    completed   = [m for m in all_matches if _is_completed_and_past(m)]
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
            try:
                scorecard = client.get_match_scorecard(mid)
            except Exception as scorecard_error:
                parsed = parse_match(info, {"scorecard": []}, resolver=resolver)
                if dry_run:
                    print(f"DRY RUN — would update match metadata; scorecard pending: {scorecard_error}")
                else:
                    upsert_match_metadata(supabase, parsed)
                    print(f"metadata OK; scorecard pending: {scorecard_error}")
                failed.append((name, f"scorecard pending: {scorecard_error}"))
                continue

            parsed    = parse_match(info, scorecard, resolver=resolver)

            if dry_run:
                print(f"DRY RUN — would insert match {parsed['match']['match_id']} "
                      f"with {len(parsed['player_stats'])} player stat rows")
            else:
                upsert_parsed(supabase, parsed, resolver=resolver)
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
