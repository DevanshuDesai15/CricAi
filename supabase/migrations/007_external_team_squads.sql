-- Store raw external squad metadata separately from canonical players.
-- This is source-of-truth ingestion data for later reconciliation.

CREATE TABLE IF NOT EXISTS public.external_team_squads (
  id             BIGSERIAL PRIMARY KEY,
  source         TEXT NOT NULL,
  team_name      TEXT NOT NULL,
  team_shortname TEXT,
  team_image     TEXT,
  raw_team_json  JSONB NOT NULL,
  imported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, team_name)
);

CREATE TABLE IF NOT EXISTS public.external_team_squad_players (
  id                 BIGSERIAL PRIMARY KEY,
  squad_id           BIGINT NOT NULL REFERENCES public.external_team_squads(id) ON DELETE CASCADE,
  source             TEXT NOT NULL,
  team_name          TEXT NOT NULL,
  external_player_id TEXT,
  external_name      TEXT NOT NULL,
  external_role      TEXT,
  batting_style      TEXT,
  bowling_style      TEXT,
  country            TEXT,
  player_image       TEXT,
  raw_player_json    JSONB NOT NULL,
  imported_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, team_name, external_name)
);

CREATE INDEX IF NOT EXISTS idx_external_team_squad_players_squad_id
  ON public.external_team_squad_players(squad_id);

CREATE INDEX IF NOT EXISTS idx_external_team_squad_players_external_player_id
  ON public.external_team_squad_players(external_player_id);
