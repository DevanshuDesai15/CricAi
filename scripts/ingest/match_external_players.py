"""
Conservative matcher for external squad players to canonical players.
"""
from __future__ import annotations

import re
from typing import Optional

from player_resolver import PlayerResolver


def _name_tokens(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", value.lower()) if token]


def _match_method_for_name(name: str) -> str:
    tokens = _name_tokens(name)
    if len(tokens) >= 2 and len(tokens[0]) == 1:
        return "resolver_initial_surname"
    return "resolver_exact"


def _confidence_for_method(method: str) -> float:
    if method == "resolver_initial_surname":
        return 0.8
    return 1.0


def match_external_player_row(
    row: dict,
    resolver: PlayerResolver,
) -> Optional[dict]:
    external_name = str(row.get("external_name", "")).strip()
    if not external_name:
        return None

    canonical_player_id = resolver.resolve(external_name)
    if not canonical_player_id or not resolver.is_canonical(canonical_player_id):
        return None

    method = _match_method_for_name(external_name)
    return {
        "external_team_squad_player_id": row["id"],
        "canonical_player_id": canonical_player_id,
        "match_method": method,
        "confidence": _confidence_for_method(method),
    }
