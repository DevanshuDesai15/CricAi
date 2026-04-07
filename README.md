# CricAI

Fantasy cricket analytics platform focused on one core question: who should you pick for tonight's Dream11 team?

The current product is IPL-first. It combines historical IPL data from Cricsheet with live-season IPL 2026 syncs from `cricketdata.org`, stores everything in Supabase, and serves a Next.js dashboard for standings, recent matches, and player analysis. The next major milestone is pre-match ML predictions for fantasy points.

## Current Status

- Phase 1 complete: app foundation, historical IPL data, player stats, dashboard
- Phase 2 complete: live IPL 2026 sync, scheduled GitHub Actions workflow, ML feature-store views
- Phase 3 next: pre-match fantasy point prediction models for upcoming IPL matches

## Product Direction

Initial ML work is intentionally scoped to IPL. If the prediction pipeline produces strong results there, the same system design can be adapted to other fantasy sports products later. The transfer target is the workflow and architecture, not a direct reuse of the exact same model across sports.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: Supabase PostgreSQL
- Auth: Clerk
- Data ingestion: Python
- Historical source: Cricsheet
- Live source: `cricketdata.org`
- ML foundation: SQL feature views in Supabase, planned Python training/inference pipeline

## What Exists Today

- IPL dashboard with 2026 standings and recent matches
- Player directory and player profile stats
- Historical IPL match and player-match-stat ingestion
- Live IPL 2026 sync via GitHub Actions
- Feature-store views for:
  - `player_recent_form`
  - `player_venue_stats`
  - `head_to_head_stats`

## Repository Structure

```text
cricAi/
├── src/app/                    # Next.js app routes and pages
├── src/components/             # UI components
├── src/lib/queries/            # Supabase-backed query helpers
├── scripts/ingest/             # Historical + live data ingestion scripts
├── scripts/tests/              # Python tests for ingestion/parsing
├── supabase/migrations/        # Schema and ML feature views
└── docs/                       # Product roadmap, specs, plans
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and provide values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CRICKETDATA_API_KEY`

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Data and Sync Workflows

### Historical IPL data

Historical data is seeded from Cricsheet through the Python ingestion scripts in `scripts/ingest/`.

### Live IPL 2026 sync

The live sync job is implemented in `scripts/ingest/sync_cricketdata.py` and scheduled in `.github/workflows/sync-ipl.yml`.

Run it locally with:

```bash
source scripts/.venv/bin/activate
python scripts/ingest/sync_cricketdata.py --year 2026
```

Dry run:

```bash
source scripts/.venv/bin/activate
python scripts/ingest/sync_cricketdata.py --year 2026 --dry-run
```

## ML Foundation

Phase 2 established the feature-store layer in `supabase/migrations/002_ml_feature_views.sql`. These views are the basis for Phase 3 model training:

- `player_recent_form`: rolling last-5 match performance
- `player_venue_stats`: career aggregates by venue
- `head_to_head_stats`: career aggregates by opposition

## Docs

- Roadmap: `docs/ROADMAP.md`
- Phase 2 design: `docs/superpowers/specs/2026-03-28-phase2-live-data-ml-foundation-design.md`
- Phase 2 implementation plan: `docs/superpowers/plans/2026-03-29-phase2-live-data-ml-foundation.md`

## Next Step

Phase 3 is the immediate priority: train and serve pre-match fantasy point predictions for upcoming IPL matches, then expose ranked player recommendations in the app.
