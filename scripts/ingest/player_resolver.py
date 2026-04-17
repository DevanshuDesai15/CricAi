"""Canonical player name to player_id resolution."""
import re
from pathlib import Path
from typing import Optional

import pandas as pd


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _name_tokens(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", value.lower()) if token]


def _initial_surname_key(value: str) -> Optional[tuple[str, str]]:
    tokens = _name_tokens(value.replace("_", " "))
    if len(tokens) < 2 or not tokens[0] or not tokens[-1]:
        return None
    return (tokens[0][0], tokens[-1])


class PlayerResolver:
    def __init__(
        self,
        lookup: dict[str, str],
        canonical_ids: set[str],
        initial_surname_lookup: dict[tuple[str, str], str],
    ):
        self._lookup = lookup
        self._canonical_ids = canonical_ids
        self._initial_surname_lookup = initial_surname_lookup

    @classmethod
    def from_rows(cls, rows: list[dict]) -> "PlayerResolver":
        lookup: dict[str, str] = {}
        canonical_ids: set[str] = set()
        initial_surname_candidates: dict[tuple[str, str], set[str]] = {}

        for row in rows:
            player_id = str(row.get("identifier", "")).strip()
            if not player_id:
                continue

            canonical_ids.add(player_id)

            for variant in (row.get("name", ""), row.get("unique_name", "")):
                raw_value = str(variant).strip()
                if not raw_value or raw_value.lower() in {"nan", "none"}:
                    continue

                lookup[raw_value] = player_id
                slug = _slugify(raw_value)
                if slug:
                    lookup[slug] = player_id

                key = _initial_surname_key(raw_value)
                if key:
                    initial_surname_candidates.setdefault(key, set()).add(player_id)

        initial_surname_lookup = {
            key: next(iter(player_ids))
            for key, player_ids in initial_surname_candidates.items()
            if len(player_ids) == 1
        }

        return cls(lookup, canonical_ids, initial_surname_lookup)

    @classmethod
    def from_csv(cls, csv_path: Path) -> "PlayerResolver":
        frame = pd.read_csv(csv_path, usecols=["identifier", "name", "unique_name"])
        return cls.from_rows(frame.to_dict(orient="records"))

    def resolve(self, name: str) -> Optional[str]:
        raw_value = str(name).strip()
        if not raw_value or raw_value.lower() in {"nan", "none"}:
            return None

        if raw_value in self._lookup:
            return self._lookup[raw_value]

        slug = _slugify(raw_value)
        if slug in self._lookup:
            return self._lookup[slug]

        key = _initial_surname_key(raw_value)
        if key and key in self._initial_surname_lookup:
            return self._initial_surname_lookup[key]

        return slug or None

    def is_canonical(self, player_id: str) -> bool:
        return player_id in self._canonical_ids
