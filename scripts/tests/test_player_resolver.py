"""Tests for player name -> canonical ID resolution."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest.player_resolver import PlayerResolver


SAMPLE_ROWS = [
    {"identifier": "dcce6f09", "name": "DA Warner", "unique_name": "DA Warner"},
    {"identifier": "a1b2c3d4", "name": "V Kohli", "unique_name": "V Kohli"},
    {"identifier": "e5f6a7b8", "name": "RG Sharma", "unique_name": "Rohit Sharma"},
    {"identifier": "11223344", "name": "JJ Bumrah", "unique_name": "JJ Bumrah"},
    {"identifier": "99887766", "name": "R Sharma", "unique_name": "R Sharma"},
    {"identifier": "88776655", "name": "RP Sharma", "unique_name": "RP Sharma"},
]


@pytest.fixture
def resolver():
    return PlayerResolver.from_rows(SAMPLE_ROWS)


def test_resolve_by_abbreviated_name(resolver):
    assert resolver.resolve("DA Warner") == "dcce6f09"


def test_resolve_by_full_name(resolver):
    assert resolver.resolve("Virat Kohli") == "a1b2c3d4"


def test_resolve_by_abbreviated_name_for_player_with_full_name(resolver):
    assert resolver.resolve("V Kohli") == "a1b2c3d4"


def test_resolve_slugified_full_name(resolver):
    assert resolver.resolve("rohit_sharma") == "e5f6a7b8"


def test_resolve_full_name_using_unique_initial_plus_surname_alias(resolver):
    assert resolver.resolve("Jasprit Bumrah") == "11223344"


def test_ambiguous_initial_plus_surname_does_not_force_alias(resolver):
    assert resolver.resolve("Rahul Sharma") == "rahul_sharma"


def test_resolve_slugified_abbreviated_name(resolver):
    assert resolver.resolve("da_warner") == "dcce6f09"


def test_resolve_unknown_player_returns_slug(resolver):
    result = resolver.resolve("XY Unknown Player")
    assert result == "xy_unknown_player"
    assert " " not in result


def test_resolve_empty_string_returns_none(resolver):
    assert resolver.resolve("") is None
    assert resolver.resolve("nan") is None


def test_is_canonical_known_player(resolver):
    assert resolver.is_canonical("dcce6f09") is True


def test_is_canonical_unknown_id(resolver):
    assert resolver.is_canonical("not_in_csv") is False
