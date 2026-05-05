-- Persist model/team forecast snapshots so completed matches can be scored later.

CREATE TABLE IF NOT EXISTS public.team_match_prediction_audits (
  id                  BIGSERIAL PRIMARY KEY,
  match_id            TEXT NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
  model_version       TEXT NOT NULL,
  team1_id            TEXT NOT NULL REFERENCES public.teams(team_id),
  team2_id            TEXT NOT NULL REFERENCES public.teams(team_id),
  team1_probability   INT NOT NULL CHECK (team1_probability BETWEEN 0 AND 100),
  team2_probability   INT NOT NULL CHECK (team2_probability BETWEEN 0 AND 100),
  favorite_team_id    TEXT NOT NULL REFERENCES public.teams(team_id),
  confidence          INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  prediction_source   TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL,
  actual_winner       TEXT REFERENCES public.teams(team_id),
  was_correct         BOOLEAN,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_match_prediction_audits_probability_sum
    CHECK (team1_probability + team2_probability = 100),
  CONSTRAINT team_match_prediction_audits_unique_snapshot
    UNIQUE (match_id, model_version, prediction_source)
);

CREATE INDEX IF NOT EXISTS idx_team_match_prediction_audits_match
  ON public.team_match_prediction_audits(match_id);

CREATE INDEX IF NOT EXISTS idx_team_match_prediction_audits_unresolved
  ON public.team_match_prediction_audits(resolved_at)
  WHERE resolved_at IS NULL;
