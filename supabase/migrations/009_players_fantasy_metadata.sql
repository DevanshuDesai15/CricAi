-- Curated fantasy metadata projected from reconciled external squad players.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS is_overseas BOOLEAN,
  ADD COLUMN IF NOT EXISTS fantasy_role TEXT,
  ADD COLUMN IF NOT EXISTS current_team_id TEXT REFERENCES public.teams(team_id);

CREATE INDEX IF NOT EXISTS idx_players_country
  ON public.players(country);

CREATE INDEX IF NOT EXISTS idx_players_fantasy_role
  ON public.players(fantasy_role);

CREATE INDEX IF NOT EXISTS idx_players_current_team_id
  ON public.players(current_team_id);
