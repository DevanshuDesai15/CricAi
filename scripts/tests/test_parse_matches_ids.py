"""Verify that Cricsheet parsing produces canonical player IDs."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_DIR = Path(__file__).parent.parent / "data" / "ipl"


def _get_sample_file():
    files = sorted([f for f in DATA_DIR.glob("*.csv") if "_info" not in f.name])
    assert files, "No IPL CSV files found in data/ipl/"
    return files[0]


def test_player_ids_have_no_spaces():
    from ingest.parse_matches import parse_match_file
    from ingest.player_resolver import PlayerResolver

    csv_path = _get_sample_file()
    resolver = PlayerResolver.from_csv(Path(__file__).parent.parent / "data" / "people.csv")
    result = parse_match_file(csv_path, resolver=resolver)
    assert result is not None

    for stat in result["player_stats"]:
        pid = stat["player_id"]
        assert pid is not None
        assert " " not in pid, f"player_id has spaces: {repr(pid)}"


def test_player_ids_are_consistent_across_two_parses():
    from ingest.parse_matches import parse_match_file
    from ingest.player_resolver import PlayerResolver

    csv_path = _get_sample_file()
    resolver = PlayerResolver.from_csv(Path(__file__).parent.parent / "data" / "people.csv")
    result1 = parse_match_file(csv_path, resolver=resolver)
    result2 = parse_match_file(csv_path, resolver=resolver)

    ids1 = {s["player_id"] for s in result1["player_stats"]}
    ids2 = {s["player_id"] for s in result2["player_stats"]}
    assert ids1 == ids2
