"""
Unit tests for backfilling unmatched external squad players into canonical players.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

from backfill_unmatched_external_players import build_missing_player_rows


class BuildMissingPlayerRowsTests(unittest.TestCase):
    def test_builds_rows_for_unmatched_external_players(self):
        rows = build_missing_player_rows(
            external_rows=[
                {"id": 1, "external_name": "Aman Khan"},
                {"id": 2, "external_name": "Ajay Jadav Mandal"},
            ],
            existing_player_ids=set(),
        )

        self.assertEqual(
            rows,
            [
                {
                    "player_id": "aman_khan",
                    "name": "Aman Khan",
                    "full_name": "Aman Khan",
                },
                {
                    "player_id": "ajay_jadav_mandal",
                    "name": "Ajay Jadav Mandal",
                    "full_name": "Ajay Jadav Mandal",
                },
            ],
        )

    def test_skips_rows_when_slug_id_already_exists(self):
        rows = build_missing_player_rows(
            external_rows=[
                {"id": 1, "external_name": "Aman Khan"},
                {"id": 2, "external_name": "Ajay Jadav Mandal"},
            ],
            existing_player_ids={"aman_khan"},
        )

        self.assertEqual(
            rows,
            [
                {
                    "player_id": "ajay_jadav_mandal",
                    "name": "Ajay Jadav Mandal",
                    "full_name": "Ajay Jadav Mandal",
                }
            ],
        )

    def test_deduplicates_same_slug_within_batch(self):
        rows = build_missing_player_rows(
            external_rows=[
                {"id": 1, "external_name": "Aman Khan"},
                {"id": 2, "external_name": "Aman Khan"},
            ],
            existing_player_ids=set(),
        )

        self.assertEqual(
            rows,
            [{"player_id": "aman_khan", "name": "Aman Khan", "full_name": "Aman Khan"}],
        )


if __name__ == "__main__":
    unittest.main()
