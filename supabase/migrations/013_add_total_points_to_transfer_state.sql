-- Track the user's current fantasy season points alongside transfer state.

ALTER TABLE public.user_transfer_state
  ADD COLUMN IF NOT EXISTS total_points INT NOT NULL DEFAULT 0 CHECK (total_points >= 0);
