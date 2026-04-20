"""
Unit tests for projecting external squad metadata onto canonical player fields.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

from project_external_player_metadata import (
    map_country_to_is_overseas,
    map_external_role_to_fantasy_role,
    map_external_team_to_team_id,
)


class ProjectExternalPlayerMetadataTests(unittest.TestCase):
    def test_maps_external_roles_to_fantasy_roles(self):
        self.assertEqual(map_external_role_to_fantasy_role("Batsman"), "BAT")
        self.assertEqual(map_external_role_to_fantasy_role("Bowler"), "BOWL")
        self.assertEqual(map_external_role_to_fantasy_role("Batting Allrounder"), "AR")
        self.assertEqual(map_external_role_to_fantasy_role("Bowling Allrounder"), "AR")
        self.assertEqual(map_external_role_to_fantasy_role("WK-Batsman"), "WK")

    def test_unknown_or_blank_roles_return_none(self):
        self.assertIsNone(map_external_role_to_fantasy_role("--"))
        self.assertIsNone(map_external_role_to_fantasy_role(""))
        self.assertIsNone(map_external_role_to_fantasy_role(None))

    def test_maps_country_to_overseas_boolean(self):
        self.assertFalse(map_country_to_is_overseas("India"))
        self.assertTrue(map_country_to_is_overseas("Australia"))
        self.assertTrue(map_country_to_is_overseas("West Indies"))
        self.assertIsNone(map_country_to_is_overseas(None))

    def test_maps_external_team_names_using_aliases(self):
        self.assertEqual(
            map_external_team_to_team_id("Royal Challengers Bengaluru"),
            "royal_challengers_bangalore",
        )
        self.assertEqual(
            map_external_team_to_team_id("Mumbai Indians"),
            "mumbai_indians",
        )
        self.assertEqual(
            map_external_team_to_team_id("Punjab Kings"),
            "punjab_kings",
        )


if __name__ == "__main__":
    unittest.main()
