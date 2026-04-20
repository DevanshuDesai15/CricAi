"""
Helpers for projecting external squad metadata onto canonical player fields.
"""
from __future__ import annotations

import re
from typing import Optional


TEAM_ALIASES = {
    "royal_challengers_bengaluru": "royal_challengers_bangalore",
}

ROLE_MAP = {
    "batsman": "BAT",
    "bowler": "BOWL",
    "batting_allrounder": "AR",
    "bowling_allrounder": "AR",
    "wk_batsman": "WK",
}


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def map_external_role_to_fantasy_role(external_role: Optional[str]) -> Optional[str]:
    if not external_role:
        return None
    normalized = _slugify(external_role)
    if normalized in {"", "--"}:
        return None
    return ROLE_MAP.get(normalized)


def map_country_to_is_overseas(country: Optional[str]) -> Optional[bool]:
    if not country:
        return None
    return country.strip().lower() != "india"


def map_external_team_to_team_id(team_name: Optional[str]) -> Optional[str]:
    if not team_name:
        return None
    normalized = _slugify(team_name)
    return TEAM_ALIASES.get(normalized, normalized)
