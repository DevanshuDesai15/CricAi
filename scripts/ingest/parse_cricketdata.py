"""
Transforms cricketdata.org API responses into DB insert dicts.

Reuses compute_fantasy_points() and slugify() from parse_matches.py.
Output format is identical to parse_match_file() in parse_matches.py so
the same upsert logic in seed_matches.py can handle both Cricsheet and API data.
"""
import re
import sys
from pathlib import Path
from typing import Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))
from parse_matches import compute_fantasy_points, slugify


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _parse_dismissal(dismissal_str: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Parse a cricketdata.org dismissal string into (dismissed, dismissal_type, fielder).

    Examples:
      "not out"                              -> (False, None, None)
      "c Rohit Sharma b Jasprit Bumrah"     -> (True, "caught", "rohit_sharma")
      "lbw b Deepak Chahar"                 -> (True, "lbw", None)
      "b Deepak Chahar"                     -> (True, "bowled", None)
      "st †MS Dhoni b Yuzvendra Chahal"     -> (True, "stumped", "ms_dhoni")
      "run out (Jadeja)"                    -> (True, "run out", "jadeja")
      "run out"                             -> (True, "run out", None)
    """
    s = dismissal_str.strip()
    if not s or s.lower() == "not out":
        return False, None, None

    # caught: "c <fielder> b <bowler>"
    m = re.match(r"^c (.+?) b .+$", s, re.IGNORECASE)
    if m:
        return True, "caught", slugify(m.group(1).strip().lstrip("†"))

    # lbw: "lbw b <bowler>"
    if re.match(r"^lbw\b", s, re.IGNORECASE):
        return True, "lbw", None

    # bowled: "b <bowler>"
    if re.match(r"^b [A-Z]", s):
        return True, "bowled", None

    # stumped: "st [†]<keeper> b <bowler>"
    m = re.match(r"^st [†]?(.+?) b .+$", s, re.IGNORECASE)
    if m:
        return True, "stumped", slugify(m.group(1).strip())

    # run out: "run out (Fielder)" or "run out"
    m = re.match(r"^run out(?: \((.+?)\))?$", s, re.IGNORECASE)
    if m:
        fielder = slugify(m.group(1).strip()) if m.group(1) else None
        return True, "run out", fielder

    # retired / hit wicket / obstructing etc.
    return True, s.lower().split()[0], None


def parse_match(match_info: dict, scorecard: dict) -> dict:
    """
    Transform cricketdata.org match_info + match_scorecard dicts into DB rows.

    Returns a dict with keys: venue, teams, match, player_stats
    (same shape as parse_match_file() in parse_matches.py)
    """
    match_guid = match_info["id"]
    match_id   = f"api_{match_guid}"

    # --- Venue ---
    venue_name = match_info.get("venue", "Unknown")
    venue_id   = slugify(venue_name)
    venue_row  = {"venue_id": venue_id, "name": venue_name}

    # --- Teams ---
    teams_raw = match_info.get("teams", [])
    team_rows = [
        {
            "team_id":    slugify(t),
            "league_id":  "ipl",
            "name":       t,
            "short_name": t[:4].upper(),
        }
        for t in teams_raw
    ]

    # --- Match ---
    raw_winner     = match_info.get("matchWinner", "")
    raw_toss       = match_info.get("tossWinner", "")
    status_str     = match_info.get("status", "").lower()
    if "no result" in status_str:
        result = "no result"
    elif "tie" in status_str or "tied" in status_str:
        result = "tie"
    else:
        result = "normal"

    match_date = match_info.get("date", "")
    season     = match_date[:4] if len(match_date) >= 4 else "2026"

    match_row = {
        "match_id":      match_id,
        "sport_id":      "cricket",
        "league_id":     "ipl",
        "season":        season,
        "match_date":    match_date,
        "venue_id":      venue_id,
        "team1_id":      slugify(teams_raw[0]) if len(teams_raw) > 0 else None,
        "team2_id":      slugify(teams_raw[1]) if len(teams_raw) > 1 else None,
        "winner":        slugify(raw_winner) if raw_winner else None,
        "toss_winner":   slugify(raw_toss)   if raw_toss   else None,
        "toss_decision": match_info.get("tossChoice") or None,
        "result":        result,
        "match_type":    "T20",
    }

    # --- Player stats ---
    # innings name → team name (e.g. "Chennai Super Kings Inning 1" → "chennai_super_kings")
    def _inning_team(inning_name: str) -> str:
        for t in teams_raw:
            if inning_name.lower().startswith(t.lower()):
                return slugify(t)
        # fallback: everything before " Inning"
        return slugify(inning_name.split(" Inning")[0])

    batting_stats  = {}   # player_id -> batting dict
    bowling_stats  = {}   # player_id -> bowling dict
    fielding_stats = {}   # player_id -> fielding dict
    player_team    = {}   # player_id -> team_id
    batting_order  = {}   # player_id -> position (1-indexed)

    for innings in scorecard.get("scorecard", []):
        team_id      = _inning_team(innings.get("inning", ""))
        batting_rows = innings.get("batting", [])
        bowling_rows = innings.get("bowling", [])

        for pos, row in enumerate(batting_rows, start=1):
            raw_name  = row.get("batsman", "")
            pid       = slugify(raw_name)
            if not pid:
                continue

            dismissed, dtype, fielder_pid = _parse_dismissal(row.get("dismissal", "not out"))

            player_team[pid] = team_id
            batting_order.setdefault(pid, pos)

            batting_stats[pid] = {
                "runs":      int(row.get("r", 0)),
                "balls":     int(row.get("b", 0)),
                "fours":     int(row.get("4s", 0)),
                "sixes":     int(row.get("6s", 0)),
                "dismissed": dismissed,
            }

            # Credit fielder (catch or stumping)
            if fielder_pid:
                f = fielding_stats.setdefault(fielder_pid, {"catches": 0, "stumpings": 0,
                                                             "run_outs_direct": 0, "run_outs_indirect": 0})
                if dtype == "caught":
                    f["catches"] += 1
                elif dtype == "stumped":
                    f["stumpings"] += 1
                elif dtype == "run out":
                    f["run_outs_direct"] += 1

        for row in bowling_rows:
            raw_name = row.get("bowler", "")
            pid      = slugify(raw_name)
            if not pid:
                continue

            overs_str = str(row.get("o", "0"))
            try:
                overs = float(overs_str)
            except ValueError:
                overs = 0.0

            bowling_stats[pid] = {
                "wickets":       int(row.get("w", 0)),
                "runs":          int(row.get("r", 0)),
                "overs":         overs,
                "maiden_overs":  int(row.get("m", 0)),
                "dismissal_types": [],   # populated below from batting dismissals
                "economy":       _safe_float(row.get("eco")),
            }

    # Back-fill dismissal_types for bowlers (needed for lbw/bowled bonus)
    for innings in scorecard.get("scorecard", []):
        for row in innings.get("batting", []):
            _, dtype, _ = _parse_dismissal(row.get("dismissal", "not out"))
            if dtype in ("lbw", "bowled"):
                s = row.get("dismissal", "")
                bm = re.search(r" b (.+)$", s, re.IGNORECASE)
                if bm:
                    bowler_pid = slugify(bm.group(1).strip())
                    if bowler_pid in bowling_stats:
                        bowling_stats[bowler_pid]["dismissal_types"].append(dtype)

    # Build player_stats rows
    all_pids     = set(batting_stats) | set(bowling_stats) | set(fielding_stats)
    player_stats = []

    for pid in all_pids:
        bat  = batting_stats.get(pid, {})
        bowl = bowling_stats.get(pid, {})
        feld = fielding_stats.get(pid, {"catches": 0, "stumpings": 0,
                                         "run_outs_direct": 0, "run_outs_indirect": 0})

        overs_bowled  = bowl.get("overs", 0.0)
        runs_conceded = bowl.get("runs", 0)
        economy       = bowl.get("economy") or (
            round(runs_conceded / overs_bowled, 2) if overs_bowled > 0 else None
        )

        fp = compute_fantasy_points(
            bat   = {"runs": bat.get("runs", 0), "fours": bat.get("fours", 0),
                     "sixes": bat.get("sixes", 0), "dismissed": bat.get("dismissed", False)},
            bowl  = {"wickets": bowl.get("wickets", 0),
                     "dismissal_types": bowl.get("dismissal_types", []),
                     "maiden_overs": bowl.get("maiden_overs", 0)},
            field = feld,
        )

        player_stats.append({
            "player_id":        pid,
            "match_id":         match_id,
            "team_id":          player_team.get(pid) or None,
            "batting_position": batting_order.get(pid),
            "runs":             bat.get("runs", 0),
            "balls_faced":      bat.get("balls", 0),
            "fours":            bat.get("fours", 0),
            "sixes":            bat.get("sixes", 0),
            "dismissed":        bat.get("dismissed", False),
            "overs_bowled":     overs_bowled,
            "wickets":          bowl.get("wickets", 0),
            "runs_conceded":    runs_conceded,
            "economy":          economy,
            "catches":          feld.get("catches", 0),
            "stumpings":        feld.get("stumpings", 0),
            "fantasy_points":   fp,
            "match_phase_breakdown": None,  # API doesn't provide ball-by-ball phase data
        })

    return {
        "venue":        venue_row,
        "teams":        team_rows,
        "match":        match_row,
        "player_stats": player_stats,
    }
