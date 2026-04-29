#!/usr/bin/env python3
"""
Update canonical player fantasy values and display names from players_details.json.

By default this is a dry run. Pass --apply to write matched rows to Supabase.
Unmatched rows are written to a CSV for manual review.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).parents[2]
SCRIPTS_ROOT = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_ROOT))

from ml.feature_engineering import create_supabase_client, fetch_all_rows

TEAM_ID_BY_SHORT_NAME = {
    "CSK": "chennai_super_kings",
    "DC": "delhi_capitals",
    "GT": "gujarat_titans",
    "KKR": "kolkata_knight_riders",
    "LSG": "lucknow_super_giants",
    "MI": "mumbai_indians",
    "PBKS": "punjab_kings",
    "RCB": "royal_challengers_bangalore",
    "RR": "rajasthan_royals",
    "SRH": "sunrisers_hyderabad",
}


def normalize_name(value: str | None) -> str:
    name = (value or "").lower().replace("_", " ")
    name = re.sub(r"[^a-z0-9 ]+", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def compact_name(value: str | None) -> str:
    return normalize_name(value).replace(" ", "")


def name_tokens(value: str | None) -> list[str]:
    return normalize_name(value).split()


def first_initial(value: str | None) -> str:
    tokens = name_tokens(value)
    return tokens[0][0] if tokens and tokens[0] else ""


def first_token(value: str | None) -> str:
    tokens = name_tokens(value)
    return tokens[0] if tokens else ""


def is_initial_style_db_name(value: str | None) -> bool:
    raw_first = (value or "").replace("_", " ").strip().split()[0] if (value or "").replace("_", " ").strip() else ""
    return raw_first.isupper() and 1 <= len(raw_first) <= 3


def first_name_compatible(json_name: str | None, db_name: str | None) -> bool:
    json_first = first_token(json_name)
    db_first = first_token(db_name)
    if not json_first or not db_first:
        return False
    if db_first == json_first:
        return True
    return is_initial_style_db_name(db_name) and db_first[0] == json_first[0]


def surname(value: str | None) -> str:
    tokens = name_tokens(value)
    return tokens[-1] if tokens else ""


def exact_name_keys(value: str | None) -> set[str]:
    normalized = normalize_name(value)
    compact = compact_name(value)
    tokens = normalized.split()
    variants = {normalized, compact}

    if len(tokens) > 1:
        sorted_name = " ".join(sorted(tokens))
        variants.add(sorted_name)
        variants.add(sorted_name.replace(" ", ""))

    for source, replacement in (("mohammad", "mohammed"), ("mohammed", "mohammad")):
        if source in tokens:
            alias_tokens = [replacement if token == source else token for token in tokens]
            alias = " ".join(alias_tokens)
            variants.add(alias)
            variants.add(alias.replace(" ", ""))

    return {key for key in variants if key}


def player_value(row: dict[str, Any]) -> float:
    return float(row["Value"])


def build_matches(
    json_players: list[dict[str, Any]],
    db_players: list[dict[str, Any]],
) -> tuple[
    list[tuple[dict[str, Any], dict[str, Any], str]],
    list[dict[str, Any]],
    list[tuple[dict[str, Any], list[dict[str, Any]], str]],
]:
    exact_index: dict[tuple[str, str | None], list[dict[str, Any]]] = defaultdict(list)
    team_surname_index: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for player in db_players:
        team_id = player.get("current_team_id")
        for key in exact_name_keys(player.get("name")):
            exact_index[(key, team_id)].append(player)
            exact_index[(key, None)].append(player)
        if team_id and surname(player.get("name")):
            team_surname_index[(team_id, surname(player.get("name")))].append(player)

    matched: list[tuple[dict[str, Any], dict[str, Any], str]] = []
    unmatched: list[dict[str, Any]] = []
    ambiguous: list[tuple[dict[str, Any], list[dict[str, Any]], str]] = []

    for json_player in json_players:
        team_id = TEAM_ID_BY_SHORT_NAME.get(json_player.get("TeamShortName"))
        keys = exact_name_keys(json_player.get("Name")) | exact_name_keys(json_player.get("ShortName"))
        candidates: list[dict[str, Any]] = []
        method = "exact_name"

        for scope in (team_id, None):
            seen_ids = set()
            for key in keys:
                for candidate in exact_index.get((key, scope), []):
                    if candidate["player_id"] not in seen_ids:
                        candidates.append(candidate)
                        seen_ids.add(candidate["player_id"])
            if candidates:
                break

        if not candidates and team_id:
            json_surname = surname(json_player.get("Name"))
            json_initial = first_initial(json_player.get("Name"))
            surname_candidates = [
                candidate
                for candidate in team_surname_index.get((team_id, json_surname), [])
                if first_initial(candidate.get("name")) == json_initial
                and first_name_compatible(json_player.get("Name"), candidate.get("name"))
            ]
            candidates = surname_candidates
            method = "team_surname_initial"

        if len(candidates) == 1:
            matched.append((json_player, candidates[0], method))
        elif len(candidates) > 1:
            ambiguous.append((json_player, candidates, method))
        else:
            unmatched.append(json_player)

    return matched, unmatched, ambiguous


def write_review_csv(
    path: Path,
    rows: list[dict[str, Any]] | list[tuple[dict[str, Any], list[dict[str, Any]], str]],
    ambiguous: bool = False,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as file:
        writer = csv.writer(file)
        if ambiguous:
            writer.writerow(["json_name", "team_short_name", "value", "candidate_player_ids"])
            for json_player, candidates, _method in rows:
                writer.writerow([
                    json_player.get("Name"),
                    json_player.get("TeamShortName"),
                    json_player.get("Value"),
                    "; ".join(f"{candidate['player_id']}:{candidate['name']}" for candidate in candidates),
                ])
        else:
            writer.writerow(["json_name", "team_short_name", "value"])
            for json_player in rows:
                writer.writerow([json_player.get("Name"), json_player.get("TeamShortName"), json_player.get("Value")])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", default=str(PROJECT_ROOT / "players_details.json"), help="Path to players_details.json")
    parser.add_argument("--apply", action="store_true", help="Write matched values and names to Supabase")
    parser.add_argument(
        "--review-dir",
        default=str(PROJECT_ROOT / "tmp" / "player_value_review"),
        help="Directory for review CSV output",
    )
    args = parser.parse_args()

    json_path = Path(args.json)
    payload = json.loads(json_path.read_text())
    json_players = payload.get("Players") or []

    supabase = create_supabase_client()
    db_players = fetch_all_rows(
        supabase.table("players").select("player_id,name,current_team_id,credit_value,fantasy_role")
    )
    fantasy_players = [player for player in db_players if player.get("fantasy_role") is not None]
    matched, unmatched, ambiguous = build_matches(json_players, fantasy_players)

    review_dir = Path(args.review_dir)
    write_review_csv(review_dir / "unmatched_players.csv", unmatched)
    write_review_csv(review_dir / "ambiguous_players.csv", ambiguous, ambiguous=True)

    print(f"JSON players: {len(json_players)}")
    print(f"DB fantasy players: {len(fantasy_players)}")
    print(f"Matched: {len(matched)}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"Ambiguous: {len(ambiguous)}")
    print(f"Review files: {review_dir}")

    if not args.apply:
        print("Dry run only. Pass --apply to update Supabase.")
        return

    for json_player, db_player, _method in matched:
        supabase.table("players").update({
            "name": json_player["Name"],
            "credit_value": player_value(json_player),
        }).eq("player_id", db_player["player_id"]).execute()

    print(f"Updated {len(matched)} players.")


if __name__ == "__main__":
    main()
