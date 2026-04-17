-- 005_infer_roles.sql
-- Infer player role from career aggregates in player_match_stats.

UPDATE players p
SET role = sub.inferred_role
FROM (
  SELECT
    player_id,
    CASE
      WHEN SUM(stumpings) > 0
        THEN 'wicketkeeper'
      WHEN AVG(overs_bowled) > 1.0 AND AVG(runs) < 10
        THEN 'bowler'
      WHEN AVG(overs_bowled) < 0.5 AND AVG(runs) > 5
        THEN 'batsman'
      WHEN AVG(overs_bowled) >= 0.5 AND AVG(runs) >= 10
        THEN 'allrounder'
      ELSE 'unknown'
    END AS inferred_role
  FROM player_match_stats
  GROUP BY player_id
  HAVING count(*) >= 3
) sub
WHERE p.player_id = sub.player_id;

UPDATE players
SET role = 'unknown'
WHERE role IS NULL;
