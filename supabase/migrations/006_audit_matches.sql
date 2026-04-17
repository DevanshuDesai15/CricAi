-- 006_audit_matches.sql
-- Delete 2026 match records that have no player stats.
-- Verify the audit query output before running.

BEGIN;

DELETE FROM player_match_stats
WHERE match_id IN (
  SELECT m.match_id
  FROM matches m
  WHERE m.season = '2026'
    AND NOT EXISTS (
      SELECT 1 FROM player_match_stats pms WHERE pms.match_id = m.match_id
    )
);

DELETE FROM matches
WHERE season = '2026'
  AND NOT EXISTS (
    SELECT 1 FROM player_match_stats pms WHERE pms.match_id = matches.match_id
  );

COMMIT;
