-- supabase/migrations/001_initial_schema.sql

-- Sports lookup (enables multi-sport expansion)
CREATE TABLE sports (
  sport_id   TEXT PRIMARY KEY,
  name       TEXT NOT NULL
);
INSERT INTO sports VALUES ('cricket', 'Cricket');

-- Leagues
CREATE TABLE leagues (
  league_id  TEXT PRIMARY KEY,
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
  player_id       TEXT PRIMARY KEY,
  cricsheet_key   TEXT UNIQUE,
  name            TEXT NOT NULL,
  full_name       TEXT,
  dob             DATE,
  nationality     TEXT,
  batting_style   TEXT,
  bowling_style   TEXT,
  primary_role    TEXT,
  leagues_played  TEXT[] DEFAULT '{}'
);

-- Venues
CREATE TABLE venues (
  venue_id                TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  city                    TEXT,
  country                 TEXT,
  avg_first_innings_score INTEGER,
  pace_vs_spin_index      NUMERIC(4,2),
  dew_factor              BOOLEAN DEFAULT FALSE,
  pitch_type              TEXT
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
  match_id        TEXT PRIMARY KEY,
  sport_id        TEXT NOT NULL REFERENCES sports(sport_id),
  league_id       TEXT NOT NULL REFERENCES leagues(league_id),
  season          TEXT NOT NULL,
  match_date      DATE NOT NULL,
  venue_id        TEXT REFERENCES venues(venue_id),
  team1_id        TEXT REFERENCES teams(team_id),
  team2_id        TEXT REFERENCES teams(team_id),
  toss_winner     TEXT REFERENCES teams(team_id),
  toss_decision   TEXT,
  winner          TEXT REFERENCES teams(team_id),
  result          TEXT,
  match_type      TEXT DEFAULT 'T20'
);

-- Player match stats
CREATE TABLE player_match_stats (
  id                    BIGSERIAL PRIMARY KEY,
  player_id             TEXT NOT NULL REFERENCES players(player_id),
  match_id              TEXT NOT NULL REFERENCES matches(match_id),
  team_id               TEXT REFERENCES teams(team_id),
  batting_position      INTEGER,
  runs                  INTEGER DEFAULT 0,
  balls_faced           INTEGER DEFAULT 0,
  fours                 INTEGER DEFAULT 0,
  sixes                 INTEGER DEFAULT 0,
  dismissed             BOOLEAN DEFAULT FALSE,
  dismissal_type        TEXT,
  overs_bowled          NUMERIC(4,1) DEFAULT 0,
  wickets               INTEGER DEFAULT 0,
  runs_conceded         INTEGER DEFAULT 0,
  economy               NUMERIC(5,2),
  catches               INTEGER DEFAULT 0,
  run_outs              INTEGER DEFAULT 0,
  stumpings            INTEGER DEFAULT 0,
  fantasy_points        NUMERIC(6,2),
  match_phase_breakdown JSONB,
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
