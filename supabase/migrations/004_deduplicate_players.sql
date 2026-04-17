-- 004_deduplicate_players.sql
-- After re-seeding with canonical resolver IDs, remove residual duplicate player rows.
-- Run this AFTER the full re-seed, not before.

BEGIN;

DELETE FROM players
WHERE NOT EXISTS (
  SELECT 1 FROM player_match_stats pms WHERE pms.player_id = players.player_id
);

DELETE FROM players
WHERE player_id IN (
  SELECT p2.player_id
  FROM players p1
  JOIN players p2 ON p1.name = p2.name AND p1.player_id < p2.player_id
  WHERE (
    SELECT count(*) FROM player_match_stats WHERE player_id = p2.player_id
  ) <= (
    SELECT count(*) FROM player_match_stats WHERE player_id = p1.player_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM player_match_stats WHERE player_id = p2.player_id
      AND NOT EXISTS (
        SELECT 1 FROM player_match_stats WHERE player_id = p1.player_id
          AND match_id = player_match_stats.match_id
      )
  )
);

COMMIT;
