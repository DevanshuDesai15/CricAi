import os
import sys
from pathlib import Path

os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("CRICKETDATA_API_KEY", "test-cricketdata-key")

sys.path.insert(0, str(Path(__file__).parent.parent / "ingest"))

from sync_cricketdata import build_player_stub_rows, get_existing_api_match_ids


class FakeQuery:
    def __init__(self, rows, table_name=None, calls=None):
        self.rows = rows
        self.table_name = table_name
        self.calls = calls if calls is not None else []

    def select(self, _columns):
        self.calls.append((self.table_name, "select", _columns))
        return self

    def eq(self, *_args):
        return self

    def like(self, *_args):
        return self

    def in_(self, *_args):
        return self

    def execute(self):
        return type("Response", (), {"data": self.rows})()


class FakeSupabase:
    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.calls = []

    def table(self, name):
        return FakeQuery(self.rows_by_table.get(name, []), table_name=name, calls=self.calls)


def test_existing_api_match_ids_excludes_seeded_unsynced_placeholders():
    supabase = FakeSupabase({
        "matches": [
            {
                "match_id": "api_seeded_fixture",
                "winner": None,
                "result": "Match starts at May 04, 14:00 GMT",
            },
            {
                "match_id": "api_completed_match",
                "winner": "mumbai_indians",
                "result": "normal",
            },
        ],
        "player_match_stats": [
            {"match_id": "api_completed_match"},
        ],
    })

    assert get_existing_api_match_ids(supabase, "2026") == {"api_completed_match"}


def test_existing_api_match_ids_excludes_metadata_only_winner_rows():
    supabase = FakeSupabase({
        "matches": [
            {
                "match_id": "api_metadata_only",
                "winner": "mumbai_indians",
                "result": "normal",
            },
        ],
        "player_match_stats": [],
    })

    assert get_existing_api_match_ids(supabase, "2026") == set()


def test_existing_api_match_ids_retries_normal_result_rows_without_winner():
    supabase = FakeSupabase({
        "matches": [
            {
                "match_id": "api_missing_winner",
                "winner": None,
                "result": "normal",
            },
        ],
        "player_match_stats": [
            {"match_id": "api_missing_winner"},
        ],
    })

    assert get_existing_api_match_ids(supabase, "2026") == set()


def test_build_player_stub_rows_includes_every_unique_player_id():
    stats = [
        {"player_id": "canonical_missing"},
        {"player_id": "unresolved_hash"},
        {"player_id": "canonical_missing"},
        {"player_id": None},
    ]

    assert build_player_stub_rows(stats) == [
        {"player_id": "canonical_missing", "name": "canonical_missing", "role": "unknown"},
        {"player_id": "unresolved_hash", "name": "unresolved_hash", "role": "unknown"},
    ]
