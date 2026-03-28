# CricAI Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Next.js dashboard displaying IPL 2025 player stats and standings, backed by a Supabase PostgreSQL database seeded with historical Cricsheet data.

**Architecture:** Next.js 14 (App Router) frontend connects to Supabase for data. A Python ingestion script downloads Cricsheet ball-by-ball CSVs, normalizes player identity using the Cricsheet player registry as the canonical source, and seeds the database. Clerk handles auth. No ML or vector work in this phase.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL), Clerk, shadcn/ui, Recharts, Python 3.11, pandas, supabase-py

---

## Decisions Locked In

- **Player identity:** Cricsheet `people.csv` registry is the canonical `player_id` source
- **Live data:** Polling every 30s (Phase 5 concern — not in scope here)
- **Auth:** Clerk (freemium gate added in Phase 5)
- **Vector DB:** Supabase pgvector (Phase 3 — not in scope here)

---

## File Map

```
cricai/
├── .env.local.example              # env var template (never commit .env.local)
├── package.json
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — ClerkProvider wraps everything
│   │   ├── page.tsx                # Home: redirects to /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx            # IPL standings + match-day snapshot
│   │   └── players/
│   │       ├── page.tsx            # Player list with search + filter
│   │       └── [id]/
│   │           └── page.tsx        # Player profile: career stats, recent matches
│   ├── lib/
│   │   ├── supabase.ts             # Supabase browser client (singleton)
│   │   ├── supabase-server.ts      # Supabase server client (for Server Components)
│   │   └── queries/
│   │       ├── players.ts          # getPlayer(), listPlayers(), getPlayerMatches()
│   │       └── matches.ts          # listMatches(), getMatchLineup()
│   └── components/
│       ├── PlayerCard.tsx          # Player stats card (used on list + profile)
│       └── StandingsTable.tsx      # IPL points table component
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # All tables from PRD data model
└── scripts/
    ├── requirements.txt
    ├── ingest/
    │   ├── download_cricsheet.py   # Downloads people.csv + T20 match ZIPs
    │   ├── seed_players.py         # Reads people.csv → inserts into players table
    │   ├── parse_matches.py        # Parses ball-by-ball YAML → match + stats rows
    │   └── seed_matches.py         # Inserts parsed match data into Supabase
    └── data/                       # gitignored — raw Cricsheet downloads land here
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via `create-next-app`)
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/supabase-server.ts`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/devanshudesai/Developer/personalWork/cricAi
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Expected: project files created, `npm run dev` starts on port 3000.

- [ ] **Step 2: Install dependencies**

```bash
npm install @clerk/nextjs @supabase/supabase-js
npm install @supabase/ssr
npx shadcn@latest init
# choose: Default style, Slate base color, yes CSS variables
npx shadcn@latest add table card badge button input
npm install recharts
```

- [ ] **Step 3: Create `.env.local.example`**

```bash
# .env.local.example — copy to .env.local and fill in values
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

- [ ] **Step 4: Create Supabase browser client at `src/lib/supabase.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Create Supabase server client at `src/lib/supabase-server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 6: Wrap root layout with ClerkProvider at `src/app/layout.tsx`**

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CricAI — Fantasy Cricket Intelligence',
  description: 'AI-powered Dream11 team predictions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
cp .env.local.example .env.local
# fill in your Supabase + Clerk keys
npm run dev
```

Expected: http://localhost:3000 loads without errors.

- [ ] **Step 8: Commit**

```bash
git init
echo "node_modules/\n.env.local\nscripts/data/" >> .gitignore
git add -A
git commit -m "feat: scaffold Next.js 14 project with Clerk and Supabase clients"
```

---

## Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Sports lookup (enables multi-sport expansion)
CREATE TABLE sports (
  sport_id   TEXT PRIMARY KEY,  -- 'cricket', 'football', 'basketball'
  name       TEXT NOT NULL
);
INSERT INTO sports VALUES ('cricket', 'Cricket');

-- Leagues
CREATE TABLE leagues (
  league_id  TEXT PRIMARY KEY,  -- 'ipl', 'bbl', 'psl', 'the_hundred', 'cpl', 'sa20'
  sport_id   TEXT NOT NULL REFERENCES sports(sport_id),
  name       TEXT NOT NULL,
  country    TEXT
);
INSERT INTO leagues VALUES
  ('ipl',         'cricket', 'Indian Premier League',     'India'),
  ('bbl',         'cricket', 'Big Bash League',           'Australia'),
  ('psl',         'cricket', 'Pakistan Super League',     'Pakistan'),
  ('the_hundred', 'cricket', 'The Hundred',               'England'),
  ('cpl',         'cricket', 'Caribbean Premier League',  'West Indies'),
  ('sa20',        'cricket', 'SA20',                      'South Africa');

-- Players (canonical identity via Cricsheet people.csv)
CREATE TABLE players (
  player_id       TEXT PRIMARY KEY,  -- Cricsheet identifier e.g. 'Kohli, Virat'
  cricsheet_key   TEXT UNIQUE,       -- Cricsheet people.csv key field
  name            TEXT NOT NULL,
  full_name       TEXT,
  dob             DATE,
  nationality     TEXT,
  batting_style   TEXT,              -- 'Right-hand bat', 'Left-hand bat'
  bowling_style   TEXT,              -- e.g. 'Right-arm fast-medium'
  primary_role    TEXT,              -- 'BAT', 'BOWL', 'AR', 'WK'
  leagues_played  TEXT[] DEFAULT '{}'
);

-- Venues
CREATE TABLE venues (
  venue_id                TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  city                    TEXT,
  country                 TEXT,
  avg_first_innings_score INTEGER,
  pace_vs_spin_index      NUMERIC(4,2),  -- >1 means pace-friendly, <1 spin-friendly
  dew_factor              BOOLEAN DEFAULT FALSE,
  pitch_type              TEXT           -- 'batting', 'bowling', 'balanced'
);

-- Teams
CREATE TABLE teams (
  team_id    TEXT PRIMARY KEY,
  league_id  TEXT NOT NULL REFERENCES leagues(league_id),
  name       TEXT NOT NULL,
  short_name TEXT
);

-- Matches
CREATE TABLE matches (
  match_id        TEXT PRIMARY KEY,   -- Cricsheet match ID (filename stem)
  sport_id        TEXT NOT NULL REFERENCES sports(sport_id),
  league_id       TEXT NOT NULL REFERENCES leagues(league_id),
  season          TEXT NOT NULL,      -- '2025', '2024/25'
  match_date      DATE NOT NULL,
  venue_id        TEXT REFERENCES venues(venue_id),
  team1_id        TEXT REFERENCES teams(team_id),
  team2_id        TEXT REFERENCES teams(team_id),
  toss_winner     TEXT REFERENCES teams(team_id),
  toss_decision   TEXT,               -- 'bat', 'field'
  winner          TEXT REFERENCES teams(team_id),
  result          TEXT,               -- 'normal', 'tie', 'no result', 'D/L'
  match_type      TEXT DEFAULT 'T20'
);

-- Player match stats
CREATE TABLE player_match_stats (
  id                   BIGSERIAL PRIMARY KEY,
  player_id            TEXT NOT NULL REFERENCES players(player_id),
  match_id             TEXT NOT NULL REFERENCES matches(match_id),
  team_id              TEXT REFERENCES teams(team_id),
  batting_position     INTEGER,
  runs                 INTEGER DEFAULT 0,
  balls_faced          INTEGER DEFAULT 0,
  fours                INTEGER DEFAULT 0,
  sixes                INTEGER DEFAULT 0,
  dismissed            BOOLEAN DEFAULT FALSE,
  dismissal_type       TEXT,
  overs_bowled         NUMERIC(4,1) DEFAULT 0,
  wickets              INTEGER DEFAULT 0,
  runs_conceded        INTEGER DEFAULT 0,
  economy              NUMERIC(5,2),
  catches              INTEGER DEFAULT 0,
  run_outs             INTEGER DEFAULT 0,
  stumpings            INTEGER DEFAULT 0,
  fantasy_points       NUMERIC(6,2),   -- computed post-insert via trigger or script
  match_phase_breakdown JSONB,          -- {"powerplay": {...}, "middle": {...}, "death": {...}}
  UNIQUE (player_id, match_id)
);

-- Team compositions per match (playing XI)
CREATE TABLE team_compositions (
  id              BIGSERIAL PRIMARY KEY,
  match_id        TEXT NOT NULL REFERENCES matches(match_id),
  team_id         TEXT NOT NULL REFERENCES teams(team_id),
  player_id       TEXT NOT NULL REFERENCES players(player_id),
  batting_order   INTEGER,
  bowling_order   INTEGER,
  is_captain      BOOLEAN DEFAULT FALSE,
  is_wk           BOOLEAN DEFAULT FALSE,
  UNIQUE (match_id, player_id)
);

-- Vector sync log (used in Phase 3 when embeddings are added)
CREATE TABLE vector_sync_log (
  player_id      TEXT PRIMARY KEY REFERENCES players(player_id),
  last_synced_at TIMESTAMPTZ,
  doc_version    INTEGER DEFAULT 0,
  pinecone_id    TEXT
);

-- Indexes for common query patterns
CREATE INDEX idx_pms_player ON player_match_stats(player_id);
CREATE INDEX idx_pms_match  ON player_match_stats(match_id);
CREATE INDEX idx_matches_league_season ON matches(league_id, season);
CREATE INDEX idx_players_nationality ON players(nationality);
```

- [ ] **Step 2: Run migration in Supabase**

Go to your Supabase project → SQL Editor → paste the contents of `001_initial_schema.sql` → Run.

Expected: all tables created with no errors. Verify in Table Editor: you should see `sports`, `leagues`, `players`, `venues`, `teams`, `matches`, `player_match_stats`, `team_compositions`, `vector_sync_log`.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial PostgreSQL schema via Supabase migration"
```

---

## Task 3: Python Ingestion Environment

**Files:**
- Create: `scripts/requirements.txt`
- Create: `scripts/ingest/download_cricsheet.py`

- [ ] **Step 1: Create `scripts/requirements.txt`**

```
pandas==2.2.2
pyyaml==6.0.1
supabase==2.4.0
python-dotenv==1.0.1
requests==2.31.0
tqdm==4.66.4
```

- [ ] **Step 2: Set up Python virtualenv**

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdir -p data
echo "data/" >> ../.gitignore
```

Expected: `pip install` completes without errors.

- [ ] **Step 3: Create `scripts/ingest/download_cricsheet.py`**

```python
"""
Downloads Cricsheet data:
  - people.csv: canonical player registry
  - t20s ZIP: all T20 international matches (YAML ball-by-ball)
  - ipl ZIP: IPL matches

Usage: python download_cricsheet.py
Output: ../data/people.csv, ../data/t20s/, ../data/ipl/
"""
import os
import zipfile
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

DOWNLOADS = {
    "people.csv": "https://cricsheet.org/register/people.csv",
    "ipl.zip":    "https://cricsheet.org/downloads/ipl_male_csv2.zip",
    "bbl.zip":    "https://cricsheet.org/downloads/bbl_male_csv2.zip",
}

def download(url: str, dest: Path) -> None:
    print(f"Downloading {url} -> {dest}")
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

def extract_zip(zip_path: Path, extract_to: Path) -> None:
    extract_to.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_to)
    print(f"Extracted {zip_path.name} -> {extract_to}")

if __name__ == "__main__":
    for filename, url in DOWNLOADS.items():
        dest = DATA_DIR / filename
        if dest.exists():
            print(f"Skipping {filename} (already downloaded)")
            continue
        download(url, dest)
        if filename.endswith(".zip"):
            extract_zip(dest, DATA_DIR / filename.replace(".zip", ""))
    print("Done. Files in:", DATA_DIR)
```

- [ ] **Step 4: Run the downloader**

```bash
cd scripts
source .venv/bin/activate
python ingest/download_cricsheet.py
```

Expected: `data/people.csv` exists (~10MB), `data/ipl/` contains CSV files for each IPL match, `data/bbl/` similar.

- [ ] **Step 5: Commit**

```bash
git add scripts/requirements.txt scripts/ingest/download_cricsheet.py
git commit -m "feat: add Cricsheet data downloader script"
```

---

## Task 4: Seed Players from Cricsheet Registry

**Files:**
- Create: `scripts/ingest/seed_players.py`

The Cricsheet `people.csv` has columns: `identifier`, `name`, `unique_name`, `cricket_data_id`, `cricinfo_id`, `cricinfo_profile`, etc. The `identifier` column is the canonical player key.

- [ ] **Step 1: Inspect people.csv structure**

```bash
cd scripts
source .venv/bin/activate
python -c "
import pandas as pd
df = pd.read_csv('data/people.csv')
print(df.columns.tolist())
print(df.head(3).to_string())
print('Total rows:', len(df))
"
```

Expected output: column names printed, 3 sample rows, total ~17,000+ rows.

- [ ] **Step 2: Create `scripts/ingest/seed_players.py`**

```python
"""
Seeds the players table from Cricsheet people.csv.
Uses the Cricsheet `identifier` as the canonical player_id.

Usage: python seed_players.py
Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (root)
"""
import os
import sys
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env.local from project root
load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATA_DIR = Path(__file__).parent.parent / "data"

BATCH_SIZE = 500

def normalize_batting_style(raw: str | float) -> str | None:
    if not isinstance(raw, str):
        return None
    s = raw.lower()
    if "left" in s:
        return "Left-hand bat"
    if "right" in s:
        return "Right-hand bat"
    return raw

def build_player_row(row: pd.Series) -> dict:
    return {
        "player_id":     row["identifier"],
        "cricsheet_key": row["identifier"],
        "name":          row["name"],
        "full_name":     row.get("full_name") if pd.notna(row.get("full_name", float("nan"))) else None,
    }

def seed(supabase: Client) -> None:
    df = pd.read_csv(DATA_DIR / "people.csv")
    print(f"Loaded {len(df)} players from people.csv")

    rows = [build_player_row(r) for _, r in df.iterrows()]

    # Upsert in batches to avoid request size limits
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("players").upsert(batch, on_conflict="player_id").execute()
        print(f"  Upserted players {i + 1}–{min(i + BATCH_SIZE, len(rows))}")

    print("Players seeded.")

if __name__ == "__main__":
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    seed(supabase)
```

- [ ] **Step 3: Run the seeder**

```bash
cd scripts
source .venv/bin/activate
python ingest/seed_players.py
```

Expected: output like `Upserted players 1–500 ... Players seeded.` Verify in Supabase Table Editor: `players` table has 15,000+ rows.

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest/seed_players.py
git commit -m "feat: seed players table from Cricsheet people.csv registry"
```

---

## Task 5: Parse and Seed IPL Match Data

**Files:**
- Create: `scripts/ingest/parse_matches.py`
- Create: `scripts/ingest/seed_matches.py`

Cricsheet CSV2 format gives one file per match. Each match CSV has rows with columns: `match_id`, `season`, `start_date`, `venue`, `innings`, `ball`, `batting_team`, `bowling_team`, `striker`, `non_striker`, `bowler`, `runs_off_bat`, `extras`, `wides`, `noballs`, `byes`, `legbyes`, `penalty`, `wicket_type`, `player_dismissed`, `other_wicket_type`, `other_player_dismissed`.

- [ ] **Step 1: Create `scripts/ingest/parse_matches.py`**

```python
"""
Parses Cricsheet CSV2 match files into normalized match + player_match_stats rows.
Returns a dict with keys: 'match', 'team_compositions', 'player_stats'

Usage: imported by seed_matches.py
"""
import re
import pandas as pd
from pathlib import Path
from typing import Any

DREAM11_POINTS = {
    "run":         1,
    "four_bonus":  1,   # +1 per boundary
    "six_bonus":   2,   # +2 per six
    "thirty_bonus": 4,  # scoring 30+ runs
    "half_century_bonus": 8,
    "century_bonus": 16,
    "duck_penalty": -2,
    "wicket":      25,
    "lbw_bowled_bonus": 8,
    "maiden_over":  4,
    "three_wicket_bonus": 4,
    "four_wicket_bonus": 8,
    "five_wicket_bonus": 16,
    "catch":       8,
    "stumping":    12,
    "run_out_direct": 12,
    "run_out_indirect": 6,
}

def compute_fantasy_points(bat: dict, bowl: dict, field: dict) -> float:
    pts = 0.0
    runs = bat.get("runs", 0)
    pts += runs * DREAM11_POINTS["run"]
    pts += bat.get("fours", 0) * DREAM11_POINTS["four_bonus"]
    pts += bat.get("sixes", 0) * DREAM11_POINTS["six_bonus"]
    if runs >= 100: pts += DREAM11_POINTS["century_bonus"]
    elif runs >= 50: pts += DREAM11_POINTS["half_century_bonus"]
    elif runs >= 30: pts += DREAM11_POINTS["thirty_bonus"]
    if runs == 0 and bat.get("dismissed", False): pts += DREAM11_POINTS["duck_penalty"]

    wickets = bowl.get("wickets", 0)
    pts += wickets * DREAM11_POINTS["wicket"]
    dismissal_types = bowl.get("dismissal_types", [])
    pts += sum(DREAM11_POINTS["lbw_bowled_bonus"] for d in dismissal_types if d in ("lbw", "bowled"))
    if wickets >= 5: pts += DREAM11_POINTS["five_wicket_bonus"]
    elif wickets >= 4: pts += DREAM11_POINTS["four_wicket_bonus"]
    elif wickets >= 3: pts += DREAM11_POINTS["three_wicket_bonus"]
    pts += bowl.get("maiden_overs", 0) * DREAM11_POINTS["maiden_over"]

    pts += field.get("catches", 0) * DREAM11_POINTS["catch"]
    pts += field.get("stumpings", 0) * DREAM11_POINTS["stumping"]
    pts += field.get("run_outs_direct", 0) * DREAM11_POINTS["run_out_direct"]
    pts += field.get("run_outs_indirect", 0) * DREAM11_POINTS["run_out_indirect"]
    return round(pts, 2)

def get_phase(ball_number: float) -> str:
    over = int(ball_number)
    if over < 6:   return "powerplay"
    if over < 15:  return "middle"
    return "death"

def parse_match_file(csv_path: Path) -> dict[str, Any] | None:
    df = pd.read_csv(csv_path, low_memory=False)
    if df.empty:
        return None

    first = df.iloc[0]
    match_id    = str(csv_path.stem)
    season      = str(first.get("season", ""))
    match_date  = str(first.get("start_date", ""))
    venue_name  = str(first.get("venue", ""))
    venue_id    = re.sub(r"[^a-z0-9]+", "_", venue_name.lower()).strip("_")

    teams = df["batting_team"].dropna().unique().tolist()
    team1 = teams[0] if len(teams) > 0 else None
    team2 = teams[1] if len(teams) > 1 else None

    match_row = {
        "match_id":    match_id,
        "sport_id":    "cricket",
        "league_id":   "ipl",
        "season":      season,
        "match_date":  match_date,
        "venue_id":    venue_id,
        "team1_id":    re.sub(r"[^a-z0-9]+", "_", team1.lower()) if team1 else None,
        "team2_id":    re.sub(r"[^a-z0-9]+", "_", team2.lower()) if team2 else None,
        "match_type":  "T20",
    }

    venue_row = {"venue_id": venue_id, "name": venue_name}

    team_rows = []
    for t in teams:
        tid = re.sub(r"[^a-z0-9]+", "_", t.lower())
        team_rows.append({"team_id": tid, "league_id": "ipl", "name": t, "short_name": tid[:4].upper()})

    # Aggregate per player
    batting: dict[str, dict] = {}
    bowling: dict[str, dict] = {}
    fielding: dict[str, dict] = {}
    player_team: dict[str, str] = {}
    batting_order: dict[str, int] = {}
    order_counter = {"innings1": 0, "innings2": 0}

    for _, row in df.iterrows():
        innings_key = f"innings{int(row.get('innings', 1))}"
        striker = str(row.get("striker", ""))
        bowler  = str(row.get("bowler", ""))
        bat_team = str(row.get("batting_team", ""))
        bowl_team = str(row.get("bowling_team", ""))
        ball = float(row.get("ball", 0))
        phase = get_phase(ball)

        # batting
        if striker:
            player_team[striker] = bat_team
            if striker not in batting:
                order_counter[innings_key] += 1
                batting_order[striker] = order_counter[innings_key]
                batting[striker] = {"runs": 0, "balls": 0, "fours": 0, "sixes": 0, "dismissed": False,
                                     "phase": {"powerplay": 0, "middle": 0, "death": 0}}
            b = batting[striker]
            runs_off_bat = int(row.get("runs_off_bat", 0) or 0)
            b["runs"]  += runs_off_bat
            b["balls"] += 1
            b["phase"][phase] += runs_off_bat
            if runs_off_bat == 4: b["fours"] += 1
            if runs_off_bat == 6: b["sixes"] += 1

        # wickets
        wicket_type = str(row.get("wicket_type", ""))
        dismissed   = str(row.get("player_dismissed", ""))
        if dismissed and dismissed != "nan":
            if dismissed in batting:
                batting[dismissed]["dismissed"] = True
            if bowler and wicket_type not in ("run out", "retired hurt", "obstructing the field"):
                if bowler not in bowling:
                    bowling[bowler] = {"wickets": 0, "runs": 0, "balls": 0, "maidens": 0,
                                       "dismissal_types": []}
                bowling[bowler]["wickets"] += 1
                bowling[bowler]["dismissal_types"].append(wicket_type)
            # fielding
            if wicket_type == "caught":
                fielder = str(row.get("other_player_dismissed", ""))
                if fielder and fielder != "nan":
                    fielding.setdefault(fielder, {"catches": 0, "stumpings": 0, "run_outs_direct": 0, "run_outs_indirect": 0})
                    fielding[fielder]["catches"] += 1
            elif wicket_type == "stumped":
                fielder = str(row.get("other_player_dismissed", ""))
                if fielder and fielder != "nan":
                    fielding.setdefault(fielder, {"catches": 0, "stumpings": 0, "run_outs_direct": 0, "run_outs_indirect": 0})
                    fielding[fielder]["stumpings"] += 1

        # bowling runs
        if bowler:
            player_team.setdefault(bowler, bowl_team)
            if bowler not in bowling:
                bowling[bowler] = {"wickets": 0, "runs": 0, "balls": 0, "maidens": 0, "dismissal_types": []}
            wides   = int(row.get("wides", 0) or 0)
            noballs = int(row.get("noballs", 0) or 0)
            bowling[bowler]["runs"] += int(row.get("runs_off_bat", 0) or 0) + wides + noballs
            if wides == 0 and noballs == 0:
                bowling[bowler]["balls"] += 1

    # Build player stats rows
    all_players = set(batting) | set(bowling) | set(fielding)
    player_stats = []
    for pid in all_players:
        bat  = batting.get(pid, {})
        bowl = bowling.get(pid, {})
        feld = fielding.get(pid, {"catches": 0, "stumpings": 0, "run_outs_direct": 0, "run_outs_indirect": 0})

        overs_bowled = round(bowl.get("balls", 0) / 6, 1)
        runs_conceded = bowl.get("runs", 0)
        economy = round(runs_conceded / overs_bowled, 2) if overs_bowled > 0 else None
        team_id = re.sub(r"[^a-z0-9]+", "_", player_team.get(pid, "").lower())

        player_stats.append({
            "player_id":    pid,
            "match_id":     match_id,
            "team_id":      team_id or None,
            "batting_position": batting_order.get(pid),
            "runs":         bat.get("runs", 0),
            "balls_faced":  bat.get("balls", 0),
            "fours":        bat.get("fours", 0),
            "sixes":        bat.get("sixes", 0),
            "dismissed":    bat.get("dismissed", False),
            "overs_bowled": overs_bowled,
            "wickets":      bowl.get("wickets", 0),
            "runs_conceded": runs_conceded,
            "economy":      economy,
            "catches":      feld.get("catches", 0),
            "stumpings":    feld.get("stumpings", 0),
            "fantasy_points": compute_fantasy_points(bat, bowl, feld),
            "match_phase_breakdown": {
                "batting_by_phase": bat.get("phase", {}),
            },
        })

    return {
        "venue":        venue_row,
        "teams":        team_rows,
        "match":        match_row,
        "player_stats": player_stats,
    }
```

- [ ] **Step 2: Create `scripts/ingest/seed_matches.py`**

```python
"""
Seeds venues, teams, matches, and player_match_stats from parsed Cricsheet IPL CSVs.

Usage: python seed_matches.py [--limit N]
  --limit N   only process first N match files (useful for testing)
"""
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm
from parse_matches import parse_match_file

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATA_DIR     = Path(__file__).parent.parent / "data" / "ipl"

def seed(limit: int | None = None) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    files = sorted(DATA_DIR.glob("*.csv"))
    if limit:
        files = files[:limit]

    print(f"Processing {len(files)} IPL match files...")
    errors = []

    for csv_path in tqdm(files):
        try:
            parsed = parse_match_file(csv_path)
            if not parsed:
                continue

            supabase.table("venues").upsert(parsed["venue"], on_conflict="venue_id").execute()

            for team in parsed["teams"]:
                supabase.table("teams").upsert(team, on_conflict="team_id").execute()

            supabase.table("matches").upsert(parsed["match"], on_conflict="match_id").execute()

            stats = parsed["player_stats"]
            for i in range(0, len(stats), 100):
                batch = stats[i:i+100]
                supabase.table("player_match_stats").upsert(
                    batch, on_conflict="player_id,match_id"
                ).execute()

        except Exception as e:
            errors.append((csv_path.name, str(e)))

    print(f"\nDone. {len(files) - len(errors)} succeeded, {len(errors)} failed.")
    if errors:
        for name, err in errors[:5]:
            print(f"  {name}: {err}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    seed(args.limit)
```

- [ ] **Step 3: Test with 5 match files first**

```bash
cd scripts
source .venv/bin/activate
python ingest/seed_matches.py --limit 5
```

Expected: 5 succeeded, 0 failed. Check Supabase Table Editor: `matches` table has 5 rows, `player_match_stats` has ~100–220 rows.

- [ ] **Step 4: Run full IPL seed**

```bash
python ingest/seed_matches.py
```

Expected: 1000+ IPL matches processed. `player_match_stats` should have 50,000+ rows.

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest/parse_matches.py scripts/ingest/seed_matches.py
git commit -m "feat: parse and seed IPL match stats from Cricsheet CSV2 files"
```

---

## Task 6: Query Layer

**Files:**
- Create: `src/lib/queries/players.ts`
- Create: `src/lib/queries/matches.ts`

- [ ] **Step 1: Create `src/lib/queries/players.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface PlayerSummary {
  player_id: string
  name: string
  nationality: string | null
  primary_role: string | null
}

export interface PlayerProfile extends PlayerSummary {
  batting_style: string | null
  bowling_style: string | null
  leagues_played: string[]
}

export interface PlayerMatchStat {
  match_id: string
  match_date: string
  runs: number
  balls_faced: number
  wickets: number
  fantasy_points: number
  team_id: string | null
}

export async function listPlayers(search?: string): Promise<PlayerSummary[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('players')
    .select('player_id, name, nationality, primary_role')
    .order('name')
    .limit(100)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPlayer(playerId: string): Promise<PlayerProfile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('players')
    .select('player_id, name, nationality, primary_role, batting_style, bowling_style, leagues_played')
    .eq('player_id', playerId)
    .single()

  if (error) return null
  return data
}

export async function getPlayerRecentStats(playerId: string, limit = 10): Promise<PlayerMatchStat[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('player_match_stats')
    .select(`
      match_id,
      runs,
      balls_faced,
      wickets,
      fantasy_points,
      team_id,
      matches!inner(match_date)
    `)
    .eq('player_id', playerId)
    .order('matches(match_date)', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    match_id:      row.match_id,
    match_date:    row.matches?.match_date ?? '',
    runs:          row.runs ?? 0,
    balls_faced:   row.balls_faced ?? 0,
    wickets:       row.wickets ?? 0,
    fantasy_points: row.fantasy_points ?? 0,
    team_id:       row.team_id,
  }))
}
```

- [ ] **Step 2: Create `src/lib/queries/matches.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface MatchSummary {
  match_id: string
  match_date: string
  team1_id: string | null
  team2_id: string | null
  winner: string | null
  venue_id: string | null
  season: string
}

export async function listRecentMatches(league: string = 'ipl', limit = 20): Promise<MatchSummary[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('matches')
    .select('match_id, match_date, team1_id, team2_id, winner, venue_id, season')
    .eq('league_id', league)
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getIPLStandings(season: string = '2025'): Promise<{ team_id: string; wins: number; losses: number; played: number }[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .select('team1_id, team2_id, winner')
    .eq('league_id', 'ipl')
    .eq('season', season)
    .not('winner', 'is', null)

  if (error) throw error

  const tally: Record<string, { wins: number; losses: number; played: number }> = {}

  for (const m of data ?? []) {
    for (const team of [m.team1_id, m.team2_id]) {
      if (!team) continue
      if (!tally[team]) tally[team] = { wins: 0, losses: 0, played: 0 }
      tally[team].played += 1
    }
    if (m.winner) {
      if (!tally[m.winner]) tally[m.winner] = { wins: 0, losses: 0, played: 0 }
      tally[m.winner].wins += 1
      const loser = m.team1_id === m.winner ? m.team2_id : m.team1_id
      if (loser) {
        if (!tally[loser]) tally[loser] = { wins: 0, losses: 0, played: 0 }
        tally[loser].losses += 1
      }
    }
  }

  return Object.entries(tally)
    .map(([team_id, stats]) => ({ team_id, ...stats }))
    .sort((a, b) => b.wins - a.wins)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/
git commit -m "feat: add Supabase query functions for players and matches"
```

---

## Task 7: Dashboard UI

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/StandingsTable.tsx`
- Create: `src/components/PlayerCard.tsx`
- Create: `src/app/players/page.tsx`
- Create: `src/app/players/[id]/page.tsx`

- [ ] **Step 1: Create `src/components/StandingsTable.tsx`**

```typescript
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TeamStanding {
  team_id: string
  wins: number
  losses: number
  played: number
}

export function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-center">Played</TableHead>
          <TableHead className="text-center">Won</TableHead>
          <TableHead className="text-center">Lost</TableHead>
          <TableHead className="text-center">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((team, i) => (
          <TableRow key={team.team_id}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="font-medium uppercase">{team.team_id.replace(/_/g, ' ')}</TableCell>
            <TableCell className="text-center">{team.played}</TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="text-green-600">{team.wins}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline" className="text-red-500">{team.losses}</Badge>
            </TableCell>
            <TableCell className="text-center font-bold">{team.wins * 2}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Create `src/components/PlayerCard.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface PlayerCardProps {
  player_id: string
  name: string
  primary_role: string | null
  nationality: string | null
}

const ROLE_COLOR: Record<string, string> = {
  BAT:  'bg-blue-100 text-blue-800',
  BOWL: 'bg-green-100 text-green-800',
  AR:   'bg-purple-100 text-purple-800',
  WK:   'bg-yellow-100 text-yellow-800',
}

export function PlayerCard({ player_id, name, primary_role, nationality }: PlayerCardProps) {
  return (
    <Link href={`/players/${encodeURIComponent(player_id)}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{name}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {primary_role && (
            <Badge className={ROLE_COLOR[primary_role] ?? 'bg-gray-100 text-gray-800'}>
              {primary_role}
            </Badge>
          )}
          {nationality && (
            <span className="text-sm text-muted-foreground">{nationality}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: Create `src/app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 4: Create `src/app/dashboard/page.tsx`**

```typescript
import { getIPLStandings, listRecentMatches } from '@/lib/queries/matches'
import { StandingsTable } from '@/components/StandingsTable'

export default async function DashboardPage() {
  const [standings, recentMatches] = await Promise.all([
    getIPLStandings('2025'),
    listRecentMatches('ipl', 10),
  ])

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">IPL 2025 Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Points Table</h2>
        {standings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No IPL 2025 data yet. Run the ingestion scripts to populate.</p>
        ) : (
          <StandingsTable standings={standings} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Matches</h2>
        <div className="space-y-2">
          {recentMatches.map(m => (
            <div key={m.match_id} className="flex justify-between items-center p-3 border rounded-lg text-sm">
              <span className="font-medium uppercase">
                {m.team1_id?.replace(/_/g, ' ')} vs {m.team2_id?.replace(/_/g, ' ')}
              </span>
              <span className="text-muted-foreground">{m.match_date}</span>
              {m.winner && (
                <span className="text-green-600 font-medium uppercase">
                  {m.winner.replace(/_/g, ' ')} won
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Create `src/app/players/page.tsx`**

```typescript
import { listPlayers } from '@/lib/queries/players'
import { PlayerCard } from '@/components/PlayerCard'
import { Input } from '@/components/ui/input'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const players = await listPlayers(q)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Players</h1>
      <form>
        <Input
          name="q"
          placeholder="Search players..."
          defaultValue={q ?? ''}
          className="max-w-sm"
        />
      </form>
      {players.length === 0 ? (
        <p className="text-muted-foreground text-sm">No players found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {players.map(p => (
            <PlayerCard key={p.player_id} {...p} />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 6: Create `src/app/players/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getPlayer, getPlayerRecentStats } from '@/lib/queries/players'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const playerId = decodeURIComponent(id)
  const [player, recentStats] = await Promise.all([
    getPlayer(playerId),
    getPlayerRecentStats(playerId, 10),
  ])

  if (!player) notFound()

  const avgFantasyPoints = recentStats.length > 0
    ? (recentStats.reduce((s, r) => s + r.fantasy_points, 0) / recentStats.length).toFixed(1)
    : 'N/A'

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          {player.primary_role && <Badge>{player.primary_role}</Badge>}
          {player.nationality && <Badge variant="outline">{player.nationality}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {player.batting_style && (
          <div><span className="text-muted-foreground">Batting: </span>{player.batting_style}</div>
        )}
        {player.bowling_style && (
          <div><span className="text-muted-foreground">Bowling: </span>{player.bowling_style}</div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Form — Avg Fantasy Points: {avgFantasyPoints}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent match data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Runs</th>
                  <th className="pb-2 text-right">Wkts</th>
                  <th className="pb-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {recentStats.map(s => (
                  <tr key={s.match_id} className="border-b last:border-0">
                    <td className="py-1">{s.match_date}</td>
                    <td className="py-1 text-right">{s.runs}</td>
                    <td className="py-1 text-right">{s.wickets}</td>
                    <td className="py-1 text-right font-medium">{s.fantasy_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 7: Verify the full app**

```bash
npm run dev
```

Visit:
- http://localhost:3000 → redirects to `/dashboard`
- http://localhost:3000/dashboard → IPL standings + recent matches
- http://localhost:3000/players → player grid with search
- http://localhost:3000/players/Kohli%2C%20Virat → Virat Kohli's profile

Expected: all pages render without errors; standings and player data populated from Supabase.

- [ ] **Step 8: Final commit**

```bash
git add src/
git commit -m "feat: Phase 1 complete — dashboard, player list, and player profile pages"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** ETL pipeline (Cricsheet), PostgreSQL schema, Next.js dashboard with live standings, player stats pages — all covered across Tasks 1–7.
- [x] **No placeholders:** All code blocks are complete and executable.
- [x] **Type consistency:** `player_id` is `TEXT` throughout (Cricsheet identifier). `PlayerMatchStat` fields match `player_match_stats` table columns. `getPlayerRecentStats` returns the same shape consumed by the profile page.
- [x] **Gaps closed:** Cricsheet `people.csv` used as canonical player registry (Task 4). Auth (Clerk) wired in Task 1. Live polling not needed for Phase 1. Supabase used instead of AWS RDS.
