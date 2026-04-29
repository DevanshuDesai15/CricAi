-- Restructure user squad storage.
--
-- Before: user_squads had one row per player (flat list, no team name).
-- After:  user_squads is team-level (name + ownership),
--         user_squad_players is player-level (linked to a squad).
--
-- Apply this migration manually in the Supabase SQL Editor.

-- ── Drop old flat table ───────────────────────────────────────────────────
DROP TABLE IF EXISTS public.user_squads;

-- ── Team-level table ──────────────────────────────────────────────────────
CREATE TABLE public.user_squads (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID    NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL DEFAULT 'My Team',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_squads_user_id ON public.user_squads(user_id);

-- ── Player-level table ────────────────────────────────────────────────────
CREATE TABLE public.user_squad_players (
  id               BIGSERIAL PRIMARY KEY,
  squad_id         BIGINT  NOT NULL REFERENCES public.user_squads(id) ON DELETE CASCADE,
  player_id        TEXT    NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  is_captain       BOOLEAN NOT NULL DEFAULT FALSE,
  is_vice_captain  BOOLEAN NOT NULL DEFAULT FALSE,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_squad_players_unique      UNIQUE (squad_id, player_id),
  CONSTRAINT user_squad_players_no_dual_role CHECK (NOT (is_captain AND is_vice_captain))
);

CREATE INDEX IF NOT EXISTS idx_user_squad_players_squad_id ON public.user_squad_players(squad_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.user_squads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_squad_players ENABLE ROW LEVEL SECURITY;

-- user_squads: own rows only
CREATE POLICY "user_squads_select_own" ON public.user_squads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_squads_insert_own" ON public.user_squads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_squads_update_own" ON public.user_squads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_squads_delete_own" ON public.user_squads
  FOR DELETE USING (auth.uid() = user_id);

-- user_squad_players: only via squads you own
CREATE POLICY "user_squad_players_select_own" ON public.user_squad_players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_squads
            WHERE user_squads.id = user_squad_players.squad_id
              AND user_squads.user_id = auth.uid())
  );

CREATE POLICY "user_squad_players_insert_own" ON public.user_squad_players
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_squads
            WHERE user_squads.id = user_squad_players.squad_id
              AND user_squads.user_id = auth.uid())
  );

CREATE POLICY "user_squad_players_update_own" ON public.user_squad_players
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_squads
            WHERE user_squads.id = user_squad_players.squad_id
              AND user_squads.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_squads
            WHERE user_squads.id = user_squad_players.squad_id
              AND user_squads.user_id = auth.uid())
  );

CREATE POLICY "user_squad_players_delete_own" ON public.user_squad_players
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_squads
            WHERE user_squads.id = user_squad_players.squad_id
              AND user_squads.user_id = auth.uid())
  );
