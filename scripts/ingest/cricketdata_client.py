"""
Thin HTTP client for the cricketdata.org REST API.

All methods return the parsed `data` field from the API response, or raise
RuntimeError on API-level errors (status != "success") and requests.HTTPError
on HTTP-level errors (4xx/5xx).

Base URL: https://api.cricapi.com/v1/
All endpoints require ?apikey={key} as a query param.
"""
import requests
from typing import Optional

BASE_URL = "https://api.cricapi.com/v1"


class CricketDataClient:
    def __init__(self, api_key: str):
        self._key = api_key
        self._session = requests.Session()

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make a GET request; return the `data` field."""
        p = {"apikey": self._key, **(params or {})}
        resp = self._session.get(f"{BASE_URL}/{endpoint}", params=p, timeout=15)
        resp.raise_for_status()
        body = resp.json()
        if body.get("status") != "success":
            raise RuntimeError(f"API error on /{endpoint}: {body.get('status')} — {body.get('reason', '')}")
        return body["data"]

    def get_ipl_series_id(self, year: int) -> str:
        """
        Search for the IPL series matching `year` and return its GUID.
        The API often returns multiple duplicate series for the same year,
        most of which are empty. We use the `matches` count from the series
        list response to pick the one with actual data — no extra API calls.
        Raises RuntimeError if no matching series is found.
        """
        results = self._get("series", params={"search": "Indian Premier League"})
        target = str(year)
        candidates = [
            s for s in results
            if target in s.get("name", "") and "Indian Premier League" in s.get("name", "")
        ]
        if not candidates:
            raise RuntimeError(f"No IPL series found for year {year}. Available: {[s.get('name') for s in results]}")

        # Pick the candidate with the most matches (uses the `matches` field
        # already present in the series list response — no extra API calls)
        best = max(candidates, key=lambda s: int(s.get("matches", 0) or 0))
        return best["id"]

    def get_series_matches(self, series_id: str) -> list[dict]:
        """
        Return the matchList for a series — each item has id, name, status,
        matchType, date, matchStarted, matchEnded.
        """
        data = self._get("series_info", params={"id": series_id})
        return data.get("matchList", [])

    def get_match_info(self, match_id: str) -> dict:
        """
        Return match-level metadata: teams, toss, winner, venue, date.
        """
        return self._get("match_info", params={"id": match_id})

    def get_match_scorecard(self, match_id: str) -> dict:
        """
        Return full scorecard with batting and bowling rows per innings.
        """
        return self._get("match_scorecard", params={"id": match_id})
