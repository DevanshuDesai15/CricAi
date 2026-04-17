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
    result = parse_match(MATCH_INFO, SCORECARD)
    stats = {s["player_id"]: s for s in result["player_stats"]}
    # fantasy points for Bumrah: 2 wickets * 25 = 50, lbw/bowled bonus 0 (dismissals were caught)
    # no maiden bonus (m=0)
    assert stats["jasprit_bumrah"]["fantasy_points"] == 50.0


def test_maiden_over_chahar_gets_credit():
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


def test_parse_match_player_ids_have_no_spaces():
    match_info = {
        "id": "test123",
        "venue": "Wankhede Stadium",
        "teams": ["Mumbai Indians", "Chennai Super Kings"],
        "matchWinner": "Mumbai Indians",
        "tossWinner": "Chennai Super Kings",
        "tossChoice": "field",
        "status": "Mumbai Indians won by 6 wickets",
        "date": "2026-03-22",
    }
    scorecard = {
        "scorecard": [
            {
                "inning": "Chennai Super Kings Inning 1",
                "batting": [
                    {
                        "batsman": {"name": "Ruturaj Gaikwad"},
                        "r": 45,
                        "b": 32,
                        "4s": 5,
                        "6s": 1,
                        "dismissal-text": "c Rohit Sharma b Jasprit Bumrah",
                    }
                ],
                "bowling": [
                    {
                        "bowler": {"name": "Jasprit Bumrah"},
                        "o": "4",
                        "r": 28,
                        "w": 1,
                        "m": 0,
                        "eco": "7.00",
                    }
                ],
            }
        ]
    }

    from ingest.player_resolver import PlayerResolver

    resolver = PlayerResolver.from_rows([])
    result = parse_match(match_info, scorecard, resolver=resolver)
    for stat in result["player_stats"]:
        pid = stat["player_id"]
        assert " " not in pid, f"player_id has spaces: {repr(pid)}"


def test_parse_match_with_no_winner_sets_winner_null():
    match_info = {
        "id": "test-no-winner",
        "venue": "Eden Gardens",
        "teams": ["Kolkata Knight Riders", "Punjab Kings"],
        "matchWinner": "No Winner",
        "tossWinner": "Punjab Kings",
        "tossChoice": "bat",
        "status": "Match tied",
        "date": "2026-04-01",
    }
    scorecard = {
        "scorecard": [
            {
                "inning": "Kolkata Knight Riders Inning 1",
                "batting": [
                    {"batsman": "A Player", "dismissal": "not out", "r": 10, "b": 8, "4s": 1, "6s": 0}
                ],
                "bowling": [
                    {"bowler": "B Bowler", "o": "1", "r": 10, "w": 0, "m": 0, "eco": "10.00"}
                ],
            }
        ]
    }

    result = parse_match(match_info, scorecard)

    assert result["match"]["result"] == "tie"
    assert result["match"]["winner"] is None
