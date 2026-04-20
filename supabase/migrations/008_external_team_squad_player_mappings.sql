-- Canonical mapping layer from raw external squad players to players.player_id.
-- Keeps reconciliation auditable and separate from raw source data.

CREATE TABLE IF NOT EXISTS public.external_team_squad_player_mappings (
  id                            BIGSERIAL PRIMARY KEY,
  external_team_squad_player_id BIGINT NOT NULL UNIQUE
    REFERENCES public.external_team_squad_players(id) ON DELETE CASCADE,
  canonical_player_id           TEXT NOT NULL
    REFERENCES public.players(player_id) ON DELETE CASCADE,
  match_method                  TEXT NOT NULL,
  confidence                    NUMERIC(3,2) NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_player_mappings_canonical_player_id
  ON public.external_team_squad_player_mappings(canonical_player_id);
