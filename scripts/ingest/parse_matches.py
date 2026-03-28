"""
Parses a single Cricsheet CSV2 match file into normalized rows for:
- venues, teams, matches, player_match_stats

Usage: imported by seed_matches.py
"""
import re
import pandas as pd
from pathlib import Path
from typing import Any, Optional

DREAM11_POINTS = {
    "run":                    1,
    "four_bonus":             1,
    "six_bonus":              2,
    "thirty_bonus":           4,
    "half_century_bonus":     8,
    "century_bonus":         16,
    "duck_penalty":          -2,
    "wicket":                25,
    "lbw_bowled_bonus":       8,
    "maiden_over":            4,
    "three_wicket_bonus":     4,
    "four_wicket_bonus":      8,
    "five_wicket_bonus":     16,
    "catch":                  8,
    "stumping":              12,
    "run_out_direct":        12,
    "run_out_indirect":       6,
}

def compute_fantasy_points(bat: dict, bowl: dict, field: dict) -> float:
    pts = 0.0
    runs = bat.get("runs", 0)
    pts += runs * DREAM11_POINTS["run"]
    pts += bat.get("fours", 0) * DREAM11_POINTS["four_bonus"]
    pts += bat.get("sixes", 0) * DREAM11_POINTS["six_bonus"]
    if runs >= 100:   pts += DREAM11_POINTS["century_bonus"]
    elif runs >= 50:  pts += DREAM11_POINTS["half_century_bonus"]
    elif runs >= 30:  pts += DREAM11_POINTS["thirty_bonus"]
    if runs == 0 and bat.get("dismissed", False):
        pts += DREAM11_POINTS["duck_penalty"]
    wickets = bowl.get("wickets", 0)
    pts += wickets * DREAM11_POINTS["wicket"]
    for d in bowl.get("dismissal_types", []):
        if d in ("lbw", "bowled"):
            pts += DREAM11_POINTS["lbw_bowled_bonus"]
    if wickets >= 5:   pts += DREAM11_POINTS["five_wicket_bonus"]
    elif wickets >= 4: pts += DREAM11_POINTS["four_wicket_bonus"]
    elif wickets >= 3: pts += DREAM11_POINTS["three_wicket_bonus"]
    pts += bowl.get("maiden_overs", 0) * DREAM11_POINTS["maiden_over"]
    pts += field.get("catches", 0)    * DREAM11_POINTS["catch"]
    pts += field.get("stumpings", 0)  * DREAM11_POINTS["stumping"]
    pts += field.get("run_outs_direct", 0)   * DREAM11_POINTS["run_out_direct"]
    pts += field.get("run_outs_indirect", 0) * DREAM11_POINTS["run_out_indirect"]
    return round(pts, 2)

def safe_int(val, default: int = 0) -> int:
    """Convert a value to int, treating NaN/None as default."""
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default

def get_phase(ball_number: float) -> str:
    over = int(ball_number)
    if over < 6:  return "powerplay"
    if over < 15: return "middle"
    return "death"

def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")

def parse_match_file(csv_path: Path) -> Optional[dict[str, Any]]:
    df = pd.read_csv(csv_path, low_memory=False)
    if df.empty:
        return None

    first = df.iloc[0]
    match_id   = str(csv_path.stem)
    season     = str(first.get("season", ""))
    match_date = str(first.get("start_date", ""))
    venue_name = str(first.get("venue", "Unknown"))
    venue_id   = slugify(venue_name)

    teams_list = df["batting_team"].dropna().unique().tolist()
    team1 = teams_list[0] if len(teams_list) > 0 else None
    team2 = teams_list[1] if len(teams_list) > 1 else None

    match_row = {
        "match_id":   match_id,
        "sport_id":   "cricket",
        "league_id":  "ipl",
        "season":     season,
        "match_date": match_date,
        "venue_id":   venue_id,
        "team1_id":   slugify(team1) if team1 else None,
        "team2_id":   slugify(team2) if team2 else None,
        "match_type": "T20",
    }

    venue_row = {"venue_id": venue_id, "name": venue_name}

    team_rows = []
    for t in teams_list:
        tid = slugify(t)
        team_rows.append({
            "team_id":    tid,
            "league_id":  "ipl",
            "name":       t,
            "short_name": t[:4].upper(),
        })

    batting: dict[str, dict]  = {}
    bowling: dict[str, dict]  = {}
    fielding: dict[str, dict] = {}
    player_team: dict[str, str] = {}
    batting_order: dict[str, int] = {}
    order_counter: dict[str, int] = {"innings1": 0, "innings2": 0}

    for _, row in df.iterrows():
        innings_key = f"innings{int(row.get('innings', 1))}"
        striker     = str(row.get("striker", ""))
        bowler      = str(row.get("bowler", ""))
        bat_team    = str(row.get("batting_team", ""))
        bowl_team   = str(row.get("bowling_team", ""))
        ball_raw = row.get("ball", 0)
        ball = 0.0 if (ball_raw is None or (isinstance(ball_raw, float) and pd.isna(ball_raw))) else float(ball_raw)
        phase       = get_phase(ball)

        if striker and striker != "nan":
            player_team[striker] = bat_team
            if striker not in batting:
                order_counter[innings_key] += 1
                batting_order[striker] = order_counter[innings_key]
                batting[striker] = {"runs": 0, "balls": 0, "fours": 0, "sixes": 0,
                                    "dismissed": False, "phase": {"powerplay": 0, "middle": 0, "death": 0}}
            b = batting[striker]
            runs_off_bat = safe_int(row.get("runs_off_bat", 0))
            b["runs"]  += runs_off_bat
            b["balls"] += 1
            b["phase"][phase] += runs_off_bat
            if runs_off_bat == 4: b["fours"] += 1
            if runs_off_bat == 6: b["sixes"] += 1

        wicket_type = str(row.get("wicket_type", ""))
        dismissed   = str(row.get("player_dismissed", ""))
        if dismissed and dismissed != "nan":
            if dismissed in batting:
                batting[dismissed]["dismissed"] = True
            if bowler and bowler != "nan" and wicket_type not in ("run out", "retired hurt", "obstructing the field"):
                bowling.setdefault(bowler, {"wickets": 0, "runs": 0, "balls": 0,
                                            "maiden_overs": 0, "dismissal_types": []})
                bowling[bowler]["wickets"] += 1
                bowling[bowler]["dismissal_types"].append(wicket_type)

            if wicket_type == "caught":
                fielder = str(row.get("fielder", row.get("other_player_dismissed", "")))
                if fielder and fielder != "nan":
                    fielding.setdefault(fielder, {"catches": 0, "stumpings": 0,
                                                  "run_outs_direct": 0, "run_outs_indirect": 0})
                    fielding[fielder]["catches"] += 1
            elif wicket_type == "stumped":
                fielder = str(row.get("fielder", row.get("other_player_dismissed", "")))
                if fielder and fielder != "nan":
                    fielding.setdefault(fielder, {"catches": 0, "stumpings": 0,
                                                  "run_outs_direct": 0, "run_outs_indirect": 0})
                    fielding[fielder]["stumpings"] += 1
            elif wicket_type == "run out":
                fielder = str(row.get("fielder", row.get("other_player_dismissed", "")))
                if fielder and fielder != "nan":
                    fielding.setdefault(fielder, {"catches": 0, "stumpings": 0,
                                                  "run_outs_direct": 0, "run_outs_indirect": 0})
                    fielding[fielder]["run_outs_direct"] += 1

        if bowler and bowler != "nan":
            player_team.setdefault(bowler, bowl_team)
            bowling.setdefault(bowler, {"wickets": 0, "runs": 0, "balls": 0,
                                        "maiden_overs": 0, "dismissal_types": []})
            wides   = safe_int(row.get("wides", 0))
            noballs = safe_int(row.get("noballs", 0))
            bowling[bowler]["runs"] += safe_int(row.get("runs_off_bat", 0)) + wides + noballs
            if wides == 0 and noballs == 0:
                bowling[bowler]["balls"] += 1

    all_players = set(batting) | set(bowling) | set(fielding)
    player_stats = []
    for pid in all_players:
        bat  = batting.get(pid, {})
        bowl = bowling.get(pid, {})
        feld = fielding.get(pid, {"catches": 0, "stumpings": 0,
                                  "run_outs_direct": 0, "run_outs_indirect": 0})
        overs_bowled  = round(bowl.get("balls", 0) / 6, 1)
        runs_conceded = bowl.get("runs", 0)
        economy = round(runs_conceded / overs_bowled, 2) if overs_bowled > 0 else None
        team_id = slugify(player_team.get(pid, ""))

        player_stats.append({
            "player_id":    pid,
            "match_id":     match_id,
            "team_id":      team_id or None,
            "batting_position": batting_order.get(pid),
            "runs":         bat.get("runs", 0),
            "balls_faced":  bat.get("balls", 0),
            "fours":        bat.get("fours", 0),
            "sixes":        bat.get("sixes", 0),
            "dismissed":    bat.get("dismissed", False),
            "overs_bowled": overs_bowled,
            "wickets":      bowl.get("wickets", 0),
            "runs_conceded": runs_conceded,
            "economy":      economy,
            "catches":      feld.get("catches", 0),
            "stumpings":    feld.get("stumpings", 0),
            "fantasy_points": compute_fantasy_points(bat, bowl, feld),
            "match_phase_breakdown": {"batting_by_phase": bat.get("phase", {})},
        })

    return {
        "venue":        venue_row,
        "teams":        team_rows,
        "match":        match_row,
        "player_stats": player_stats,
    }
