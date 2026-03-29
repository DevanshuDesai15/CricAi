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
        Raises RuntimeError if no matching series is found.
        """
        results = self._get("series", params={"search": "Indian Premier League"})
        target = str(year)
        for series in results:
            name = series.get("name", "")
            if target in name and "Indian Premier League" in name:
                return series["id"]
        raise RuntimeError(f"No IPL series found for year {year}. Available: {[s.get('name') for s in results]}")

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
