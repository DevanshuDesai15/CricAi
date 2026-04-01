-- supabase/migrations/002_ml_feature_views.sql
-- ML feature store views for Phase 3 prediction models.
-- All three views are read-only — they aggregate existing player_match_stats data.

-- ─────────────────────────────────────────────
-- 1. player_recent_form
--    Rolling 5-match averages per player per league.
--    Query the latest row per player to get their current form heading into a match.
--
--    Example query:
--      SELECT DISTINCT ON (player_id) *
--      FROM player_recent_form
--      WHERE league_id = 'ipl'
--      ORDER BY player_id, match_date DESC;
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW player_recent_form AS
SELECT
  pms.player_id,
  pms.team_id,
  m.league_id,
  m.season,
  m.match_date,
  m.match_id,
  ROUND(AVG(pms.runs)            OVER w, 2) AS avg_runs_last5,
  ROUND(AVG(pms.wickets)         OVER w, 2) AS avg_wickets_last5,
  ROUND(AVG(pms.economy)         OVER w, 2) AS avg_economy_last5,
  ROUND(AVG(pms.fantasy_points)  OVER w, 2) AS avg_fantasy_points_last5,
  COUNT(*)                       OVER w      AS matches_in_window
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WINDOW w AS (
  PARTITION BY pms.player_id, m.league_id
  ORDER BY m.match_date
  ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
);


-- ─────────────────────────────────────────────
-- 2. player_venue_stats
--    Career aggregates per player per venue.
--    Key predictor: some batsmen thrive at high-scoring venues (Wankhede),
--    others struggle on turning tracks (Chepauk).
--
--    Example query:
--      SELECT * FROM player_venue_stats
--      WHERE player_id = 'virat_kohli' AND league_id = 'ipl'
--      ORDER BY matches_played DESC;
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW player_venue_stats AS
SELECT
  pms.player_id,
  m.venue_id,
  m.league_id,
  COUNT(*)                           AS matches_played,
  ROUND(AVG(pms.runs),           2)  AS avg_runs,
  ROUND(AVG(pms.wickets),        2)  AS avg_wickets,
  ROUND(AVG(pms.economy),        2)  AS avg_economy,
  ROUND(AVG(pms.fantasy_points), 2)  AS avg_fantasy_points
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WHERE m.venue_id IS NOT NULL
GROUP BY pms.player_id, m.venue_id, m.league_id;


-- ─────────────────────────────────────────────
-- 3. head_to_head_stats
--    Career aggregates per player vs each opposition team.
--    Key predictor: certain batsmen dominate specific bowling attacks.
--
--    Example query:
--      SELECT * FROM head_to_head_stats
--      WHERE player_id = 'rohit_sharma'
--        AND opposition_team_id = 'chennai_super_kings'
--        AND league_id = 'ipl';
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW head_to_head_stats AS
SELECT
  pms.player_id,
  pms.team_id                          AS player_team_id,
  CASE
    WHEN m.team1_id = pms.team_id THEN m.team2_id
    ELSE m.team1_id
  END                                  AS opposition_team_id,
  m.league_id,
  COUNT(*)                             AS matches_played,
  ROUND(AVG(pms.runs),           2)    AS avg_runs,
  ROUND(AVG(pms.wickets),        2)    AS avg_wickets,
  ROUND(AVG(pms.fantasy_points), 2)    AS avg_fantasy_points
FROM player_match_stats pms
JOIN matches m ON m.match_id = pms.match_id
WHERE pms.team_id IS NOT NULL
GROUP BY
  pms.player_id,
  pms.team_id,
  opposition_team_id,
  m.league_id;
