"""
Parse a local IPL squad JSON export into normalized team and player rows.
"""
from __future__ import annotations


DEFAULT_SOURCE = "cricapi_ipl_squad_json"


def parse_ipl_squad_payload(payload: dict, source: str = DEFAULT_SOURCE) -> dict:
    teams = payload.get("data")
    if not isinstance(teams, list):
        raise ValueError("Expected payload['data'] to be a list")

    normalized_teams = []
    normalized_players = []

    for team in teams:
        team_name = team.get("teamName")
        if not team_name:
            raise ValueError("Each team must include teamName")

        normalized_teams.append(
            {
                "source": source,
                "team_name": team_name,
                "team_shortname": team.get("shortname"),
                "team_image": team.get("img"),
                "raw_team_json": team,
            }
        )

        players = team.get("players") or []
        if not isinstance(players, list):
            raise ValueError(f"Expected players list for team {team_name}")

        for player in players:
            normalized_players.append(
                {
                    "source": source,
                    "team_name": team_name,
                    "external_player_id": player.get("id"),
                    "external_name": player.get("name"),
                    "external_role": player.get("role"),
                    "batting_style": player.get("battingStyle"),
                    "bowling_style": player.get("bowlingStyle"),
                    "country": player.get("country"),
                    "player_image": player.get("playerImg"),
                    "raw_player_json": player,
                }
            )

    return {"teams": normalized_teams, "players": normalized_players}
