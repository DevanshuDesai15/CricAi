# Phase 2: Live Data Ingestion & ML Foundation
**Date:** 2026-03-28
**Status:** Approved
**Scope:** IPL 2026 current-season data via cricketdata.org + GitHub Actions automation + ML feature groundwork

---

## 1. Problem

The dashboard currently shows IPL data from Cricsheet, which has a multi-week publishing delay. IPL 2026 started March 22, 2026 and has no coverage yet. Users see stale 2025 standings and cannot use the app meaningfully during the live season.

Additionally, the ML prediction feature (pick your Dream11 team before a match) needs structured player form data — rolling stats across recent matches — that doesn't exist yet.

---

## 2. Goals

- IPL 2026 match results appear in the dashboard **the same night they're played**, automatically
- Zero manual intervention required — GitHub Actions handles the daily sync
- Player form data (last N matches) is queryable for ML feature engineering
- Historical Cricsheet data (2007–2025) and live API data live in the **same schema** seamlessly
- Stay on free tier of cricketdata.org during IPL 2026 window

## 3. Non-Goals

- No live in-match updates (pre-match use case doesn't need this)
- No ball-by-ball data (not available from cricketdata.org yet)
- No ML model training in this phase (that's Phase 3)
- No changes to the frontend dashboard beyond consuming the new data
- No BBL or other league sync (IPL only for now)

---

## 4. Data Sources

| Source | Use | Format | Freshness |
|--------|-----|--------|-----------|
| **Cricsheet** | IPL 2007–2025 historical | CSV2 (already seeded) | Weekly delay, already done |
| **cricketdata.org** | IPL 2026 current season | JSON REST API | Same-day (post-match) |

When Cricsheet eventually publishes IPL 2026 data (likely end of season), we backfill via the existing `seed_matches.py --season 2026` command and the API sync becomes redundant.

**cricketdata.org API:**
- Base URL: `https://api.cricapi.com/v1/`
- Auth: `?apikey={key}` query param
- Free tier: 100 hits/day (sufficient — IPL match day uses ~15 calls max)
- No paid plan needed unless IPL + other leagues are added simultaneously

---

## 5. Architecture

```
cricketdata.org API
        │
        ▼
scripts/ingest/sync_cricketdata.py   ← new Python script
        │  fetches: series → match list → scorecards
        │  transforms: API format → our DB schema
        │  upserts: venues, teams, matches, player_match_stats
        ▼
Supabase PostgreSQL                  ← existing schema, unchanged
        │
        ▼
Next.js Dashboard                    ← existing queries, unchanged
```

**GitHub Actions** triggers the Python script on a cron schedule. No new infrastructure, no new services.

---

## 6. New Script: `scripts/ingest/sync_cricketdata.py`

### Responsibilities

1. **Discover new matches** — fetch the IPL 2026 series from cricketdata.org, get all match IDs, cross-reference against matches already in Supabase, identify unseen match IDs
2. **Fetch scorecards** — for each unseen match: fetch `match_info` + `match_scorecard` + `match_squad`
3. **Transform** — map API response fields to our DB schema (see mapping below)
4. **Upsert** — venues → teams → matches → player_match_stats (same upsert pattern as existing seed scripts)
5. **Log** — print summary: N matches synced, N skipped (already in DB), N failed

### API Call Budget per Run

| Call | Purpose | Count |
|------|---------|-------|
| `series?search=IPL` | Find 2026 series ID | 1 |
| `series_info?id={guid}` | Get all match IDs in series | 1 |
| `match_info?id={id}` | Winner, venue, toss, date | 1 per new match |
| `match_scorecard?id={id}` | Batting + bowling per innings | 1 per new match |

Typical IPL day: 1 match = **4 calls**. Double-header day: **6 calls**. Well within the 100/day free limit.

### Field Mapping: cricketdata.org → DB Schema

**`matches` table:**
| DB Column | API Source |
|-----------|-----------|
| `match_id` | `match_info.id` (cricketdata GUID) |
| `league_id` | hardcoded `"ipl"` |
| `season` | hardcoded `"2026"` (or parsed from series name) |
| `match_date` | `match_info.date` |
| `venue_id` | `slugify(match_info.venue)` |
| `team1_id` | `slugify(match_info.teams[0])` |
| `team2_id` | `slugify(match_info.teams[1])` |
| `winner` | `slugify(match_info.matchWinner)` |
| `toss_winner` | `slugify(match_info.tossWinner)` |
| `toss_decision` | `match_info.tossChoice` |
| `result` | `"normal"` / `"no result"` / `"tie"` |
| `match_type` | hardcoded `"T20"` |

**`player_match_stats` table (from scorecard):**
| DB Column | API Source |
|-----------|-----------|
| `player_id` | `slugify(batsman.batsman)` |
| `match_id` | match GUID |
| `team_id` | derived from innings team name |
| `runs` | `batsman.r` |
| `balls_faced` | `batsman.b` |
| `fours` | `batsman.4s` |
| `sixes` | `batsman.6s` |
| `dismissed` | `batsman.dismissal != "not out"` |
| `wickets` | `bowler.w` |
| `runs_conceded` | `bowler.r` |
| `overs_bowled` | `bowler.o` |
| `economy` | `bowler.eco` |
| `fantasy_points` | computed via existing `compute_fantasy_points()` |

**Player identity:** cricketdata.org uses full names (e.g. "Virat Kohli"). We slugify to `virat_kohli` — same approach as Cricsheet. The `players` table auto-upserts missing players by name (same logic already in `seed_matches.py`).

> **Note on match_id collision:** cricketdata.org uses GUIDs (e.g. `abc123-def456`) while Cricsheet uses numeric IDs (e.g. `1473438`). These namespaces don't collide naturally. When Cricsheet publishes 2026 data later, those matches get inserted with numeric IDs — the GUID records from this phase become orphaned duplicates. **Resolution:** prefix API-sourced IDs with `"api_"` (e.g. `api_abc123-def456`) so they're identifiable and can be cleaned up via a dedup script when Cricsheet catches up.

---

## 7. GitHub Actions Workflow: `.github/workflows/sync-ipl.yml`

```
Schedule: 30 17 * * *    (UTC = 11:30 PM IST, after all IPL matches finish)
Trigger:  also manually dispatchable via workflow_dispatch
```

**Steps:**
1. Checkout repo
2. Set up Python 3.9
3. Install dependencies from `scripts/requirements.txt`
4. Run `python scripts/ingest/sync_cricketdata.py`
5. Print summary — matches synced, errors

**Required GitHub Secrets:**
| Secret | Value |
|--------|-------|
| `CRICKETDATA_API_KEY` | From cricketdata.org dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

No new dependencies — uses existing `supabase`, `requests`, `python-dotenv` packages.

---

## 8. ML Feature Foundation

This phase doesn't train models, but it lays the data groundwork so Phase 3 can start immediately.

### New DB View: `player_recent_form`

A Supabase view (or materialized view) that pre-computes rolling stats per player:

```sql
-- Last 5 matches rolling average for each player
player_id, league_id, season,
avg_runs_last5, avg_wickets_last5, avg_fantasy_points_last5,
avg_economy_last5, matches_last5
```

This view is what the ML feature pipeline reads — no complex aggregation in the model code.

### New DB View: `player_venue_stats`

Per player, per venue aggregate:
```sql
player_id, venue_id,
avg_runs, avg_wickets, avg_fantasy_points, matches_played
```

Captures venue-specific performance — a key predictor for fantasy (some batsmen thrive at Wankhede, struggle at Chepauk).

### New DB View: `head_to_head_stats`

Per player, per opposing team:
```sql
player_id, opposition_team_id,
avg_runs, avg_wickets, avg_fantasy_points, matches_played
```

These three views are the primary feature store for Phase 3 model training. No schema changes needed — pure SQL on existing `player_match_stats` data.

---

## 9. Dependencies & Secrets Management

**New dependency:** None — existing `requests` and `supabase` packages cover the API calls.

**New secret:** `CRICKETDATA_API_KEY` stored in:
- GitHub Actions secrets (for automated sync)
- `.env.local` (for local testing, already gitignored)
- `.env.local.example` updated with placeholder

---

## 10. Error Handling & Reliability

- **API rate limit hit:** script catches 429 response, logs warning, skips remaining matches for that run. Next nightly run retries them.
- **Missing scorecard:** some matches may not have scorecard data yet (API limitation). Script skips them and retries next run.
- **Partial failure:** each match is upserted independently. A failure on match N doesn't block matches N+1..N+k.
- **Idempotency:** all upserts use `on_conflict` — re-running the script is always safe.

---

## 11. Out of Scope (Deferred to Phase 3)

- ML model training (XGBoost, regression)
- Prediction API endpoints
- Dashboard prediction UI
- Pinecone / pgvector embeddings
- Multi-league sync (BBL, PSL etc.)
- Cricsheet 2026 backfill dedup script (needed end of season)

---

## 12. Success Criteria

- [ ] IPL 2026 match results appear in dashboard within 24 hours of being played
- [ ] `player_recent_form` view returns correct last-5 rolling averages
- [ ] GitHub Actions workflow runs daily without manual intervention
- [ ] Free tier (100 hits/day) is not exceeded on any single run
- [ ] Re-running the sync script on already-synced data produces no duplicates or errors
