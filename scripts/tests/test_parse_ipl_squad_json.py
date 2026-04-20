"""
Unit tests for parse_ipl_squad_json.py.
The parser turns the local IPL squad JSON export into normalized
team and player rows for database ingestion.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

from parse_ipl_squad_json import parse_ipl_squad_payload


SAMPLE_PAYLOAD = {
    "data": [
        {
            "teamName": "Delhi Capitals",
            "shortname": "DC",
            "img": "https://example.com/dc.png",
            "players": [
                {
                    "id": "player-1",
                    "name": "Karun Nair",
                    "role": "Batsman",
                    "battingStyle": "Right Handed Bat",
                    "bowlingStyle": "Right-arm offbreak",
                    "country": "India",
                    "playerImg": "https://example.com/player-1.png",
                },
                {
                    "id": "player-2",
                    "name": "Jake Fraser-McGurk",
                    "role": "Batsman",
                    "battingStyle": "Right Handed Bat",
                    "bowlingStyle": None,
                    "country": "Australia",
                    "playerImg": "https://example.com/player-2.png",
                },
            ],
        },
        {
            "teamName": "Mumbai Indians",
            "shortname": "MI",
            "img": "https://example.com/mi.png",
            "players": [
                {
                    "id": "player-3",
                    "name": "Jasprit Bumrah",
                    "role": "Bowler",
                    "battingStyle": "Right Handed Bat",
                    "bowlingStyle": "Right-arm fast",
                    "country": "India",
                    "playerImg": "https://example.com/player-3.png",
                }
            ],
        },
    ]
}


class ParseIPLSquadPayloadTests(unittest.TestCase):
    def test_returns_normalized_teams_and_players(self):
        result = parse_ipl_squad_payload(SAMPLE_PAYLOAD)

        self.assertEqual(set(result.keys()), {"teams", "players"})
        self.assertEqual(len(result["teams"]), 2)
        self.assertEqual(len(result["players"]), 3)

    def test_normalizes_team_fields(self):
        result = parse_ipl_squad_payload(SAMPLE_PAYLOAD)
        team = result["teams"][0]

        self.assertEqual(team["source"], "cricapi_ipl_squad_json")
        self.assertEqual(team["team_name"], "Delhi Capitals")
        self.assertEqual(team["team_shortname"], "DC")
        self.assertEqual(team["team_image"], "https://example.com/dc.png")
        self.assertEqual(team["raw_team_json"]["teamName"], "Delhi Capitals")

    def test_normalizes_player_fields(self):
        result = parse_ipl_squad_payload(SAMPLE_PAYLOAD)
        player = result["players"][0]

        self.assertEqual(player["source"], "cricapi_ipl_squad_json")
        self.assertEqual(player["team_name"], "Delhi Capitals")
        self.assertEqual(player["external_player_id"], "player-1")
        self.assertEqual(player["external_name"], "Karun Nair")
        self.assertEqual(player["external_role"], "Batsman")
        self.assertEqual(player["batting_style"], "Right Handed Bat")
        self.assertEqual(player["bowling_style"], "Right-arm offbreak")
        self.assertEqual(player["country"], "India")
        self.assertEqual(player["player_image"], "https://example.com/player-1.png")
        self.assertEqual(player["raw_player_json"]["name"], "Karun Nair")

    def test_keeps_null_optional_player_fields(self):
        result = parse_ipl_squad_payload(SAMPLE_PAYLOAD)
        player = result["players"][1]

        self.assertIsNone(player["bowling_style"])
        self.assertEqual(player["country"], "Australia")

    def test_raises_for_missing_data_array(self):
        with self.assertRaises(ValueError):
            parse_ipl_squad_payload({})

    def test_raises_for_team_without_name(self):
        payload = {"data": [{"shortname": "DC", "img": None, "players": []}]}

        with self.assertRaises(ValueError):
            parse_ipl_squad_payload(payload)


if __name__ == "__main__":
    unittest.main()
