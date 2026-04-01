# CricAI — Product Roadmap

> Fantasy cricket analytics platform. Core use case: **pick your Dream11 team before a match** using ML-powered player performance predictions.

---

## Phase 1 — Foundation ✅ COMPLETE

**Goal:** Working app with historical IPL data, player profiles, and dashboard.

**What was built:**
- Next.js 14 app with Clerk auth and Supabase backend
- PostgreSQL schema: players, matches, venues, teams, player_match_stats
- Python ingestion pipeline (Cricsheet CSV2 format)
- Seeded 7+ years of IPL data (2007–2025), ~1,100 matches, ball-by-ball stats
- Dashboard: IPL standings, recent matches with winners
- Player list page with search
- Player profile page with recent stats
- Dream11 fantasy points calculated per player per match

**Spec/Plan:** `docs/superpowers/plans/2026-03-27-phase1-foundation.md`

---

## Phase 2 — Live Data Ingestion & ML Foundation ✅ COMPLETE

**Goal:** IPL 2026 current-season data synced automatically; feature store ready for ML.

**Data strategy:**
- **Cricsheet** → historical IPL 2007–2025 (already seeded, free)
- **cricketdata.org API** → IPL 2026 current season (same-day results, free tier 100 req/day)
- Both sources feed the same DB schema — ML model queries without caring which source

**What was built:**
- `scripts/ingest/cricketdata_client.py` — thin HTTP wrapper for cricketdata.org API
- `scripts/ingest/parse_cricketdata.py` — transforms API JSON → DB rows (same shape as Cricsheet parser)
- `scripts/ingest/sync_cricketdata.py` — orchestrator: discover new matches → fetch scorecard → upsert. Supports `--dry-run` and `--year` flags
- `.github/workflows/sync-ipl.yml` — GitHub Actions cron at **11:30 PM IST daily**, also manually triggerable
- `supabase/migrations/002_ml_feature_views.sql` — 3 ML feature store views:
  - `player_recent_form` — rolling 5-match averages per player
  - `player_venue_stats` — career stats per player per venue
  - `head_to_head_stats` — career stats per player vs each opposition team

**Manual steps still needed:**
- Add 3 GitHub Secrets (CRICKETDATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Apply `002_ml_feature_views.sql` in Supabase SQL Editor

**Spec:** `docs/superpowers/specs/2026-03-28-phase2-live-data-ml-foundation-design.md`
**Plan:** `docs/superpowers/plans/2026-03-29-phase2-live-data-ml-foundation.md`

---

## Phase 3 — ML Prediction Models 🔜 NEXT

**Goal:** Predict individual player fantasy points for an upcoming match so users can confidently pick their Dream11 XI.

**Use case:** "Tonight's match is CSK vs MI at Wankhede. Show me predicted fantasy points for each player in both squads."

**Approach (pre-match prediction only — not live):**
- Train on historical Cricsheet data (2007–2025, ~1,100 matches)
- Features from the Phase 2 views: recent form, venue stats, head-to-head stats
- Additional features: batting position, role (bat/bowl/all-rounder), toss result, home/away

**Models to explore:**
- **XGBoost regression** — predict fantasy points per player (baseline, interpretable)
- **LightGBM** — faster training, handles sparse features well
- Start simple: one model per role (batsman model, bowler model, all-rounder model)

**What to build:**
- `scripts/ml/feature_engineering.py` — pulls from the 3 Phase 2 views, builds feature vectors
- `scripts/ml/train.py` — trains and serialises models (joblib/pickle)
- `scripts/ml/predict.py` — given match context (teams, venue, date), outputs predicted fantasy points per player
- API route `/api/predictions/match/[matchId]` — serves predictions to the frontend
- Dashboard: pre-match prediction panel showing ranked players by predicted fantasy points

**ML concepts you'll learn in this phase:**
- Feature engineering for tabular sports data
- Train/test split by time (last season = test, everything before = train)
- Regression evaluation: MAE, RMSE on fantasy points
- Feature importance: which stats predict performance best

---

## Phase 4 — Player Embeddings & Similarity 🔮 PLANNED

**Goal:** "Find me players similar to Virat Kohli" and "which players are in form right now across all leagues."

**Approach:**
- Embed each player as a vector from their career stats (avg runs, avg wickets, economy, fantasy pts by phase)
- Store embeddings in pgvector (Supabase supports it natively)
- Cosine similarity queries for player comparison
- The `vector_sync_log` table is already in the schema waiting for this

**What to build:**
- `scripts/ml/embed_players.py` — generates player embeddings from aggregated career stats
- pgvector column on `players` table
- `/api/players/[id]/similar` — returns N most similar players
- Player profile: "Similar players" panel

---

## Phase 5 — Freemium & Polish 🔮 PLANNED

**Goal:** Shareable product with a free tier and paid predictions tier.

**What to build:**
- Clerk auth gates: free users see historical stats, paid users get ML predictions
- Match schedule page: upcoming IPL matches with countdown
- Shareable team link: "Here's my predicted Dream11 for tonight"
- Mobile-responsive layout improvements
- Performance: ISR/caching for prediction pages (predictions don't change once generated pre-match)

---

## Key Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Historical data source | Cricsheet (free) | Ball-by-ball, complete, 7+ seasons |
| Live data source | cricketdata.org (free tier) | Legitimate API, ~15 calls/day for IPL |
| Database | Supabase (PostgreSQL) | Hosted, free tier, pgvector for Phase 4 |
| Auth | Clerk | Drop-in Next.js integration |
| ML framework | XGBoost + scikit-learn | Tabular data, interpretable, fast |
| Embeddings | pgvector (Supabase) | No separate vector DB needed |
| Player identity | Slugified name | Consistent across Cricsheet and API sources |
| API match IDs | `api_` prefix | Prevents collision with Cricsheet numeric IDs |

---

## File Structure (current)

```
cricAi/
├── src/app/
│   ├── dashboard/page.tsx        # IPL standings + recent matches
│   ├── players/page.tsx          # Player list with search
│   └── players/[id]/page.tsx     # Player profile + stats
├── src/lib/queries/
│   ├── matches.ts                # getIPLStandings, listRecentMatches
│   └── players.ts                # getPlayer, listPlayers, getPlayerRecentStats
├── scripts/ingest/
│   ├── download_cricsheet.py     # Download Cricsheet data (--force to refresh)
│   ├── seed_players.py           # Seed players from people.csv
│   ├── seed_matches.py           # Seed historical matches (--season filter)
│   ├── parse_matches.py          # Cricsheet CSV → DB rows + fantasy points
│   ├── cricketdata_client.py     # cricketdata.org API client
│   ├── parse_cricketdata.py      # API JSON → DB rows
│   └── sync_cricketdata.py       # Daily sync orchestrator (--dry-run, --year)
├── scripts/tests/
│   └── test_parse_cricketdata.py # 13 unit tests for API transformer
├── supabase/migrations/
│   ├── 001_initial_schema.sql    # All tables + indexes
│   └── 002_ml_feature_views.sql  # ML feature store views (apply manually)
├── .github/workflows/
│   └── sync-ipl.yml              # Daily cron sync at 11:30 PM IST
└── docs/
    ├── ROADMAP.md                ← this file
    ├── superpowers/specs/        # Design docs per phase
    └── superpowers/plans/        # Implementation plans per phase
```
