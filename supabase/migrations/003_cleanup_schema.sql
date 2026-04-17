-- 003_cleanup_schema.sql
-- Drop always-null columns from players table.
-- Add role column for ML use (populated by 005_infer_roles.sql).

ALTER TABLE players
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS nationality,
  DROP COLUMN IF EXISTS bowling_style,
  DROP COLUMN IF EXISTS primary_role,
  DROP COLUMN IF EXISTS leagues_played;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS role TEXT;

COMMENT ON COLUMN players.role IS
  'Inferred player role: batsman, bowler, allrounder, wicketkeeper. Populated by migration 005.';
