-- Transfer Assistant auth and user-owned squad storage.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS credit_value NUMERIC(4,1) DEFAULT 8.0;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.user_squads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  is_captain BOOLEAN NOT NULL DEFAULT FALSE,
  is_vice_captain BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_squads_unique_player UNIQUE (user_id, player_id),
  CONSTRAINT user_squads_distinct_leadership CHECK (NOT (is_captain AND is_vice_captain))
);

CREATE TABLE IF NOT EXISTS public.user_transfer_state (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  transfers_used INT NOT NULL DEFAULT 0 CHECK (transfers_used >= 0 AND transfers_used <= 160),
  boosters_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_squads_user_id ON public.user_squads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transfer_state_user_id ON public.user_transfer_state(user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transfer_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_squads_select_own" ON public.user_squads;
CREATE POLICY "user_squads_select_own"
  ON public.user_squads
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_squads_insert_own" ON public.user_squads;
CREATE POLICY "user_squads_insert_own"
  ON public.user_squads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_squads_update_own" ON public.user_squads;
CREATE POLICY "user_squads_update_own"
  ON public.user_squads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_squads_delete_own" ON public.user_squads;
CREATE POLICY "user_squads_delete_own"
  ON public.user_squads
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_transfer_state_select_own" ON public.user_transfer_state;
CREATE POLICY "user_transfer_state_select_own"
  ON public.user_transfer_state
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_transfer_state_insert_own" ON public.user_transfer_state;
CREATE POLICY "user_transfer_state_insert_own"
  ON public.user_transfer_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_transfer_state_update_own" ON public.user_transfer_state;
CREATE POLICY "user_transfer_state_update_own"
  ON public.user_transfer_state
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_transfer_state_delete_own" ON public.user_transfer_state;
CREATE POLICY "user_transfer_state_delete_own"
  ON public.user_transfer_state
  FOR DELETE
  USING (auth.uid() = user_id);
