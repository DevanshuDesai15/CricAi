# Phase 2: Live Data Ingestion & ML Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync IPL 2026 match results from cricketdata.org daily via GitHub Actions, and add three SQL views that serve as the ML feature store for Phase 3.

**Architecture:** A new Python sync script (`sync_cricketdata.py`) discovers completed IPL 2026 matches not yet in Supabase, fetches their scorecards from the cricketdata.org API, transforms them into our existing DB schema, and upserts. A GitHub Actions workflow runs this on cron daily at 11:30 PM IST. Three SQL views pre-aggregate player form, venue, and head-to-head stats for Phase 3 ML feature engineering.

**Tech Stack:** Python 3.9, requests, supabase-py, pytest, GitHub Actions, PostgreSQL (Supabase), cricketdata.org REST API

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `scripts/ingest/cricketdata_client.py` | Create | Thin HTTP wrapper for cricketdata.org API |
| `scripts/ingest/parse_cricketdata.py` | Create | Transform API JSON → DB insert dicts |
| `scripts/ingest/sync_cricketdata.py` | Create | Orchestrate: discover → fetch → upsert |
| `scripts/tests/__init__.py` | Create | Makes tests directory a Python package |
| `scripts/tests/test_parse_cricketdata.py` | Create | Unit tests for parse_cricketdata.py |
| `.github/workflows/sync-ipl.yml` | Create | Scheduled GitHub Actions sync job |
| `supabase/migrations/002_ml_feature_views.sql` | Create | ML feature store views |
| `.env.local.example` | Modify | Add CRICKETDATA_API_KEY placeholder |

---

## Task 1: Test infrastructure and env setup

**Files:**
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/test_parse_cricketdata.py`
- Modify: `.env.local.example`

- [ ] **Step 1: Create the tests package**

```bash
mkdir -p /path/to/cricAi/scripts/tests
touch scripts/tests/__init__.py
```

- [ ] **Step 2: Add the API key placeholder to .env.local.example**

In `.env.local.example`, add after the Supabase block:

```
# cricketdata.org (for IPL 2026 live sync)
# Sign up free at https://cricketdata.org
CRICKETDATA_API_KEY=your_api_key_here
```

- [ ] **Step 3: Write the failing unit tests**

Create `scripts/tests/test_parse_cricketdata.py`:

```python
"""
Unit tests for parse_cricketdata.py — the API JSON → DB row transformer.
All tests use static fixture data; no network calls are made.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

import pytest
from parse_cricketdata import parse_match

# --- Fixtures ---

MATCH_INFO = {
    "id": "abc123-def456",
    "name": "Chennai Super Kings vs Mumbai Indians, 1st T20",
    "matchType": "t20",
    "status": "Chennai Super Kings won by 5 wickets",
    "venue": "MA Chidambaram Stadium, Chennai",
    "date": "2026-03-22",
    "teams": ["Chennai Super Kings", "Mumbai Indians"],
    "tossWinner": "Chennai Super Kings",
    "tossChoice": "field",
    "matchWinner": "Chennai Super Kings",
    "matchStarted": True,
    "matchEnded": True,
}

SCORECARD = {
    "id": "abc123-def456",
    "scorecard": [
        {
            "inning": "Chennai Super Kings Inning 1",
            "batting": [
                {
                    "batsman": "Ruturaj Gaikwad",
                    "dismissal": "c Rohit Sharma b Jasprit Bumrah",
                    "r": 67, "b": 45, "4s": 6, "6s": 2, "sr": 148.8,
                },
                {
                    "batsman": "Devon Conway",
                    "dismissal": "not out",
                    "r": 45, "b": 30, "4s": 4, "6s": 1, "sr": 150.0,
                },
            ],
            "bowling": [
                {
                    "bowler": "Jasprit Bumrah",
                    "o": "4.0", "m": 0, "r": 28, "w": 2, "wd": 1, "nb": 0, "eco": 7.0,
                },
            ],
        },
        {
            "inning": "Mumbai Indians Inning 2",
            "batting": [
                {
                    "batsman": "Rohit Sharma",
                    "dismissal": "lbw b Deepak Chahar",
                    "r": 32, "b": 25, "4s": 3, "6s": 1, "sr": 128.0,
                },
            ],
            "bowling": [
                {
                    "bowler": "Deepak Chahar",
                    "o": "4.0", "m": 1, "r": 22, "w": 1, "wd": 0, "nb": 0, "eco": 5.5,
                },
            ],
        },
    ],
}


# --- Tests ---

def test_parse_match_returns_required_keys():
    result = parse_match(MATCH_INFO, SCORECARD)
    assert set(result.keys()) == {"venue", "teams", "match", "player_stats"}


def test_match_id_has_api_prefix():
    result = parse_match(MATCH_INFO, SCORECARD)
    assert result["match"]["match_id"] == "api_abc123-def456"


def test_match_winner_is_slugified():
    result = parse_match(MATCH_INFO, SCORECARD)
    assert result["match"]["winner"] == "chennai_super_kings"


def test_match_toss_fields():
    result = parse_match(MATCH_INFO, SCORECARD)
    m = result["match"]
    assert m["toss_winner"] == "chennai_super_kings"
    assert m["toss_decision"] == "field"


def test_venue_row():
    result = parse_match(MATCH_INFO, SCORECARD)
    assert result["venue"]["venue_id"] == "ma_chidambaram_stadium_chennai"
    assert result["venue"]["name"] == "MA Chidambaram Stadium, Chennai"


def test_two_teams_parsed():
    result = parse_match(MATCH_INFO, SCORECARD)
    team_ids = {t["team_id"] for t in result["teams"]}
    assert "chennai_super_kings" in team_ids
    assert "mumbai_indians" in team_ids


def test_batting_stats_gaikwad():
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    g = stats["ruturaj_gaikwad"]
    assert g["runs"] == 67
    assert g["balls_faced"] == 45
    assert g["fours"] == 6
    assert g["sixes"] == 2
    assert g["dismissed"] is True
    assert g["batting_position"] == 1


def test_not_out_batsman():
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    assert stats["devon_conway"]["dismissed"] is False


def test_bowling_stats_bumrah():
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    b = stats["jasprit_bumrah"]
    assert b["wickets"] == 2
    assert b["overs_bowled"] == 4.0
    assert b["runs_conceded"] == 28
    assert b["economy"] == 7.0


def test_maiden_over_bumrah_not_credited():
    # Bumrah bowled 0 maidens per the fixture
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    # fantasy points for Bumrah: 2 wickets * 25 = 50, lbw/bowled bonus 0 (dismissals were caught)
    # no maiden bonus (m=0)
    assert stats["jasprit_bumrah"]["fantasy_points"] == 50.0


def test_maiden_over_chahar_gets_credit():
    # Chahar bowled 1 maiden, 1 wicket (lbw)
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    # 1 wicket (25) + lbw bonus (8) + 1 maiden (4) = 37
    assert stats["deepak_chahar"]["fantasy_points"] == 37.0


def test_player_team_assignment():
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    assert stats["ruturaj_gaikwad"]["team_id"] == "chennai_super_kings"
    assert stats["rohit_sharma"]["team_id"] == "mumbai_indians"


def test_match_season_and_league():
    result = parse_match(MATCH_INFO, SCORECARD)
    m = result["match"]
    assert m["season"] == "2026"
    assert m["league_id"] == "ipl"
    assert m["sport_id"] == "cricket"
    assert m["match_type"] == "T20"
```

- [ ] **Step 4: Run tests and confirm they fail (parse_cricketdata.py doesn't exist yet)**

```bash
cd scripts && source .venv/bin/activate
python -m pytest tests/test_parse_cricketdata.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'parse_cricketdata'`

- [ ] **Step 5: Commit test scaffold**

```bash
git add scripts/tests/__init__.py scripts/tests/test_parse_cricketdata.py .env.local.example
git commit -m "test: add failing unit tests for cricketdata.org transformer"
```

---

## Task 2: API client

**Files:**
- Create: `scripts/ingest/cricketdata_client.py`

- [ ] **Step 1: Create the client**

Create `scripts/ingest/cricketdata_client.py`:

```python
"""
Thin HTTP client for the cricketdata.org REST API.

All methods return the parsed `data` field from the API response, or raise
RuntimeError on API-level errors (status != "success") and requests.HTTPError
on HTTP-level errors (4xx/5xx).

Base URL: https://api.cricapi.com/v1/
All endpoints require ?apikey={key} as a query param.
"""
import requests

BASE_URL = "https://api.cricapi.com/v1"


class CricketDataClient:
    def __init__(self, api_key: str):
        self._key = api_key
        self._session = requests.Session()

    def _get(self, endpoint: str, params: dict | None = None) -> dict:
        """Make a GET request; return the `data` field."""
        p = {"apikey": self._key, **(params or {})}
        resp = self._session.get(f"{BASE_URL}/{endpoint}", params=p, timeout=15)
        resp.raise_for_status()
        body = resp.json()
        if body.get("status") != "success":
            raise RuntimeError(f"API error on /{endpoint}: {body.get('status')} — {body.get('reason', '')}")
        return body["data"]

    def get_ipl_series_id(self, year: int) -> str:
        """
        Search for the IPL series matching `year` and return its GUID.
        Raises RuntimeError if no matching series is found.
        """
        results = self._get("series", params={"search": "Indian Premier League"})
        # results is a list of series objects
        target = str(year)
        for series in results:
            name = series.get("name", "")
            if target in name and "Indian Premier League" in name:
                return series["id"]
        raise RuntimeError(f"No IPL series found for year {year}. Available: {[s.get('name') for s in results]}")

    def get_series_matches(self, series_id: str) -> list[dict]:
        """
        Return the matchList for a series — each item has id, name, status,
        matchType, date, matchStarted, matchEnded.
        """
        data = self._get("series_info", params={"id": series_id})
        return data.get("matchList", [])

    def get_match_info(self, match_id: str) -> dict:
        """
        Return match-level metadata: teams, toss, winner, venue, date.
        """
        return self._get("match_info", params={"id": match_id})

    def get_match_scorecard(self, match_id: str) -> dict:
        """
        Return full scorecard with batting and bowling rows per innings.
        """
        return self._get("match_scorecard", params={"id": match_id})
```

- [ ] **Step 2: Verify import works (no syntax errors)**

```bash
cd scripts && source .venv/bin/activate
python -c "from ingest.cricketdata_client import CricketDataClient; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/cricketdata_client.py
git commit -m "feat: add cricketdata.org API client"
```

---

## Task 3: Data transformer

**Files:**
- Create: `scripts/ingest/parse_cricketdata.py`

This is the most complex task. It transforms `match_info` + `scorecard` dicts (from the API) into the same dict format that `seed_matches.py` already knows how to upsert.

- [ ] **Step 1: Create the transformer**

Create `scripts/ingest/parse_cricketdata.py`:

```python
"""
Transforms cricketdata.org API responses into DB insert dicts.

Reuses compute_fantasy_points() and slugify() from parse_matches.py.
Output format is identical to parse_match_file() in parse_matches.py so
the same upsert logic in seed_matches.py can handle both Cricsheet and API data.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parse_matches import compute_fantasy_points, slugify


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _parse_dismissal(dismissal_str: str) -> tuple[bool, str | None, str | None]:
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

    batting_stats:  dict[str, dict] = {}   # player_id → batting dict
    bowling_stats:  dict[str, dict] = {}   # player_id → bowling dict
    fielding_stats: dict[str, dict] = {}   # player_id → fielding dict
    player_team:    dict[str, str]  = {}   # player_id → team_id
    batting_order:  dict[str, int]  = {}   # player_id → position (1-indexed)

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
                # Find which bowler got this dismissal from the dismissal string
                # Format: "lbw b Bowler Name" or "b Bowler Name"
                s = row.get("dismissal", "")
                bm = re.search(r" b (.+)$", s, re.IGNORECASE)
                if bm:
                    bowler_pid = slugify(bm.group(1).strip())
                    if bowler_pid in bowling_stats:
                        bowling_stats[bowler_pid]["dismissal_types"].append(dtype)

    # Build player_stats rows
    all_pids    = set(batting_stats) | set(bowling_stats) | set(fielding_stats)
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
            bat  = {"runs": bat.get("runs", 0), "fours": bat.get("fours", 0),
                    "sixes": bat.get("sixes", 0), "dismissed": bat.get("dismissed", False)},
            bowl = {"wickets": bowl.get("wickets", 0),
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
```

- [ ] **Step 2: Run the tests — they should all pass now**

```bash
cd scripts && source .venv/bin/activate
python -m pytest tests/test_parse_cricketdata.py -v
```

Expected output (all green):
```
tests/test_parse_cricketdata.py::test_parse_match_returns_required_keys PASSED
tests/test_parse_cricketdata.py::test_match_id_has_api_prefix PASSED
tests/test_parse_cricketdata.py::test_match_winner_is_slugified PASSED
tests/test_parse_cricketdata.py::test_match_toss_fields PASSED
tests/test_parse_cricketdata.py::test_venue_row PASSED
tests/test_parse_cricketdata.py::test_two_teams_parsed PASSED
tests/test_parse_cricketdata.py::test_batting_stats_gaikwad PASSED
tests/test_parse_cricketdata.py::test_not_out_batsman PASSED
tests/test_parse_cricketdata.py::test_bowling_stats_bumrah PASSED
tests/test_parse_cricketdata.py::test_maiden_over_bumrah_not_credited PASSED
tests/test_parse_cricketdata.py::test_maiden_over_chahar_gets_credit PASSED
tests/test_parse_cricketdata.py::test_player_team_assignment PASSED
tests/test_parse_cricketdata.py::test_match_season_and_league PASSED

13 passed in 0.XXs
```

If any test fails, read the assertion error carefully and fix the corresponding logic in `parse_cricketdata.py` before continuing.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/parse_cricketdata.py
git commit -m "feat: add cricketdata.org JSON transformer with full fantasy points"
```

---

## Task 4: Sync orchestrator

**Files:**
- Create: `scripts/ingest/sync_cricketdata.py`

This script is the entry point that GitHub Actions calls. It ties together the client and transformer, handles idempotency, and prints a summary.

- [ ] **Step 1: Create the orchestrator**

Create `scripts/ingest/sync_cricketdata.py`:

```python
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


def get_existing_api_match_ids(supabase, season: str) -> set[str]:
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
```

- [ ] **Step 2: Smoke test with --dry-run (requires your real API key in .env.local)**

Add `CRICKETDATA_API_KEY=<your_key>` to `.env.local`, then:

```bash
cd scripts && source .venv/bin/activate
python ingest/sync_cricketdata.py --dry-run
```

Expected output (no DB writes, just logs):
```
[sync] Finding IPL 2026 series...
[sync] Series ID: <some-guid>
[sync] N completed T20 matches in series (of M total)
[sync] K new matches to sync (already have 0)
[sync]   Fetching: <match name> ... DRY RUN — would insert match api_<guid> with N player stat rows
...
[sync] Done. K synced, 0 failed.
```

If you see `RuntimeError: No IPL series found for year 2026`, it means Cricsheet hasn't published the 2026 series yet on cricketdata.org. The sync will silently succeed (nothing to do) once the series appears.

- [ ] **Step 3: Run for real (removes --dry-run flag)**

```bash
cd scripts && source .venv/bin/activate
python ingest/sync_cricketdata.py
```

Verify in Supabase that new rows appear in `matches` with `match_id` starting with `api_`.

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest/sync_cricketdata.py
git commit -m "feat: add cricketdata.org sync orchestrator with dry-run support"
```

---

## Task 5: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/sync-ipl.yml`

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/sync-ipl.yml`:

```yaml
name: Sync IPL 2026 Data

on:
  # 11:30 PM IST = 18:00 UTC
  schedule:
    - cron: "0 18 * * *"
  # Allow manual trigger from GitHub Actions UI
  workflow_dispatch:
    inputs:
      year:
        description: "IPL season year to sync"
        required: false
        default: "2026"
      dry_run:
        description: "Dry run (no DB writes)"
        required: false
        default: "false"
        type: choice
        options: ["true", "false"]

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.9"
          cache: "pip"
          cache-dependency-path: "scripts/requirements.txt"

      - name: Install dependencies
        run: pip install -r scripts/requirements.txt

      - name: Run IPL sync
        env:
          CRICKETDATA_API_KEY:        ${{ secrets.CRICKETDATA_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL:   ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY:  ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          YEAR=${{ github.event.inputs.year || '2026' }}
          DRY=${{ github.event.inputs.dry_run || 'false' }}
          FLAGS="--year $YEAR"
          if [ "$DRY" = "true" ]; then FLAGS="$FLAGS --dry-run"; fi
          python scripts/ingest/sync_cricketdata.py $FLAGS
```

- [ ] **Step 3: Add GitHub Secrets**

In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|-------------|-------|
| `CRICKETDATA_API_KEY` | Your cricketdata.org API key |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oeomakowgjxuxhwdfogb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (from `.env.local`) |

- [ ] **Step 4: Validate the workflow YAML syntax**

```bash
# Install actionlint if you have it, or just check YAML is parseable
python -c "import yaml; yaml.safe_load(open('.github/workflows/sync-ipl.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 5: Push and trigger a manual run**

```bash
git add .github/workflows/sync-ipl.yml
git commit -m "feat: add GitHub Actions workflow for daily IPL sync at 11:30 PM IST"
git push origin master
```

Then go to **GitHub → Actions → Sync IPL 2026 Data → Run workflow** and trigger a dry run (`dry_run: true`) to verify the workflow runs without errors.

Expected: Green check, logs showing `[sync] Done. N synced, 0 failed.`

---

## Task 6: ML feature views

**Files:**
- Create: `supabase/migrations/002_ml_feature_views.sql`

These views are the feature store that Phase 3 ML code will query. They run on your existing `player_match_stats` + `matches` data — no new tables required.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/002_ml_feature_views.sql`:

```sql
-- supabase/migrations/002_ml_feature_views.sql
-- ML feature store views for Phase 3 prediction models.
-- All three views are read-only — they aggregate existing player_match_stats data.

-- ─────────────────────────────────────────────
-- 1. player_recent_form
--    Rolling 5-match averages per player per league.
--    Query the latest row per player to get their current form heading into a match.
--
--    Example query:
--      SELECT DISTINCT ON (player_id) *
--      FROM player_recent_form
--      WHERE league_id = 'ipl'
--      ORDER BY player_id, match_date DESC;
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW player_recent_form AS
SELECT
  pms.player_id,
  pms.team_id,
  m.league_id,
  m.season,
  m.match_date,
  m.match_id,
  ROUND(AVG(pms.runs)            OVER w, 2) AS avg_runs_last5,
  ROUND(AVG(pms.wickets)         OVER w, 2) AS avg_wickets_last5,
  ROUND(AVG(pms.economy)         OVER w, 2) AS avg_economy_last5,
  ROUND(AVG(pms.fantasy_points)  OVER w, 2) AS avg_fantasy_points_last5,
  COUNT(*)                       OVER w      AS matches_in_window
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WINDOW w AS (
  PARTITION BY pms.player_id, m.league_id
  ORDER BY m.match_date
  ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
);


-- ─────────────────────────────────────────────
-- 2. player_venue_stats
--    Career aggregates per player per venue.
--    Key predictor: some batsmen thrive at high-scoring venues (Wankhede),
--    others struggle on turning tracks (Chepauk).
--
--    Example query:
--      SELECT * FROM player_venue_stats
--      WHERE player_id = 'virat_kohli' AND league_id = 'ipl'
--      ORDER BY matches_played DESC;
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW player_venue_stats AS
SELECT
  pms.player_id,
  m.venue_id,
  m.league_id,
  COUNT(*)                           AS matches_played,
  ROUND(AVG(pms.runs),           2)  AS avg_runs,
  ROUND(AVG(pms.wickets),        2)  AS avg_wickets,
  ROUND(AVG(pms.economy),        2)  AS avg_economy,
  ROUND(AVG(pms.fantasy_points), 2)  AS avg_fantasy_points
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WHERE m.venue_id IS NOT NULL
GROUP BY pms.player_id, m.venue_id, m.league_id;


-- ─────────────────────────────────────────────
-- 3. head_to_head_stats
--    Career aggregates per player vs each opposition team.
--    Key predictor: certain batsmen dominate specific bowling attacks.
--
--    Example query:
--      SELECT * FROM head_to_head_stats
--      WHERE player_id = 'rohit_sharma'
--        AND opposition_team_id = 'chennai_super_kings'
--        AND league_id = 'ipl';
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW head_to_head_stats AS
SELECT
  pms.player_id,
  pms.team_id                          AS player_team_id,
  CASE
    WHEN m.team1_id = pms.team_id THEN m.team2_id
    ELSE m.team1_id
  END                                  AS opposition_team_id,
  m.league_id,
  COUNT(*)                             AS matches_played,
  ROUND(AVG(pms.runs),           2)    AS avg_runs,
  ROUND(AVG(pms.wickets),        2)    AS avg_wickets,
  ROUND(AVG(pms.fantasy_points), 2)    AS avg_fantasy_points
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WHERE pms.team_id IS NOT NULL
GROUP BY
  pms.player_id,
  pms.team_id,
  opposition_team_id,
  m.league_id;
```

- [ ] **Step 2: Apply the migration in Supabase**

In the Supabase dashboard, go to **SQL Editor** and run the contents of `002_ml_feature_views.sql`.

Alternatively via the Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Smoke test each view**

In the Supabase SQL Editor, run each of these and verify they return rows:

```sql
-- Should return rows for any player with ≥1 match
SELECT * FROM player_recent_form
WHERE league_id = 'ipl'
LIMIT 5;

-- Should return rows showing venue performance
SELECT * FROM player_venue_stats
WHERE league_id = 'ipl'
ORDER BY matches_played DESC
LIMIT 5;

-- Should return rows showing head-to-head data
SELECT * FROM head_to_head_stats
WHERE league_id = 'ipl'
ORDER BY matches_played DESC
LIMIT 5;
```

All three should return data (not empty) since we already have 7+ seasons of Cricsheet IPL data seeded.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_ml_feature_views.sql
git commit -m "feat: add ML feature store views (recent form, venue stats, head-to-head)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] cricketdata.org API client (Task 2)
- [x] `api_` prefix on match IDs (Task 3 — `match_id = f"api_{match_guid}"`)
- [x] Discover new matches, skip already-synced (Task 4 — `get_existing_api_match_ids`)
- [x] GitHub Actions cron at 11:30 PM IST (Task 5 — `cron: "0 18 * * *"`)
- [x] Manual trigger via `workflow_dispatch` (Task 5)
- [x] Required GitHub Secrets documented (Task 5, Step 3)
- [x] `player_recent_form` view (Task 6)
- [x] `player_venue_stats` view (Task 6)
- [x] `head_to_head_stats` view (Task 6)
- [x] `.env.local.example` updated (Task 1, Step 2)
- [x] Idempotency (upsert with `on_conflict` throughout)
- [x] Partial failure handling (per-match try/except in sync loop)
- [x] Rate limit handling — 4 API calls per match × ~2 matches/day = 8 calls, well within 100/day free tier

**Placeholder scan:** No TBDs, no "similar to above" steps. Every code block is complete.

**Type consistency:** `parse_match()` returns keys `venue`, `teams`, `match`, `player_stats` — same keys used in `upsert_parsed()` in Task 4. `compute_fantasy_points(bat, bowl, field)` signature matches `parse_matches.py:compute_fantasy_points`.
