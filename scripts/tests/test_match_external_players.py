"""
Unit tests for external squad player matching against canonical players.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

from match_external_players import match_external_player_row
from player_resolver import PlayerResolver


def build_resolver() -> PlayerResolver:
    return PlayerResolver.from_rows(
        [
            {"identifier": "virat01", "name": "Virat Kohli", "unique_name": "Virat Kohli"},
            {"identifier": "shami01", "name": "Mohammed Shami", "unique_name": "Mohammed Shami"},
            {"identifier": "dhoni01", "name": "MS Dhoni", "unique_name": "MS Dhoni"},
        ]
    )


class MatchExternalPlayersTests(unittest.TestCase):
    def test_matches_exact_name_to_canonical_player(self):
        result = match_external_player_row(
            {"id": 101, "external_name": "Virat Kohli"},
            build_resolver(),
        )

        self.assertIsNotNone(result)
        self.assertEqual(result["external_team_squad_player_id"], 101)
        self.assertEqual(result["canonical_player_id"], "virat01")
        self.assertEqual(result["match_method"], "resolver_exact")
        self.assertEqual(result["confidence"], 1.0)

    def test_matches_initial_surname_variant(self):
        result = match_external_player_row(
            {"id": 102, "external_name": "M Shami"},
            build_resolver(),
        )

        self.assertIsNotNone(result)
        self.assertEqual(result["canonical_player_id"], "shami01")
        self.assertEqual(result["match_method"], "resolver_initial_surname")
        self.assertEqual(result["confidence"], 0.8)

    def test_returns_none_for_unresolved_player(self):
        result = match_external_player_row(
            {"id": 103, "external_name": "Completely Unknown"},
            build_resolver(),
        )

        self.assertIsNone(result)

    def test_returns_none_when_resolver_only_generates_slug(self):
        resolver = build_resolver()
        result = match_external_player_row(
            {"id": 104, "external_name": "New Prospect"},
            resolver,
        )

        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
