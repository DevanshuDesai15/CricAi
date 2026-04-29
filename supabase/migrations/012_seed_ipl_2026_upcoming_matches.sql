-- Seed IPL 2026 upcoming fixtures from CricAPI series_info.
--
-- Source JSON: IPL_matches.json
-- Series ID: 87c62aac-bc3c-4738-ab93-19da0690488f
--
-- Apply manually in the Supabase SQL Editor. This is intentionally an
-- idempotent upsert so it can be rerun when fixture metadata is refreshed.

INSERT INTO public.matches (
  match_id,
  sport_id,
  league_id,
  season,
  match_date,
  venue_id,
  team1_id,
  team2_id,
  toss_winner,
  toss_decision,
  winner,
  result,
  match_type
)
VALUES
  ('api_8fbd3678-6299-4e67-8c28-74d4952b6ae7', 'cricket', 'ipl', '2026', '2026-04-28', NULL, 'punjab_kings', 'rajasthan_royals', NULL, NULL, NULL, 'Match starts at Apr 28, 14:00 GMT', 'T20'),
  ('api_05d33d50-3efe-42f9-98f7-1f363a2f153a', 'cricket', 'ipl', '2026', '2026-04-29', NULL, 'mumbai_indians', 'sunrisers_hyderabad', NULL, NULL, NULL, 'Match starts at Apr 29, 14:00 GMT', 'T20'),
  ('api_7e0789c4-6bdc-48da-a67f-49213f6d731e', 'cricket', 'ipl', '2026', '2026-04-30', NULL, 'gujarat_titans', 'royal_challengers_bangalore', NULL, NULL, NULL, 'Match starts at Apr 30, 14:00 GMT', 'T20'),
  ('api_3093f73b-639c-464c-8497-b6b238b5b9af', 'cricket', 'ipl', '2026', '2026-05-01', NULL, 'rajasthan_royals', 'delhi_capitals', NULL, NULL, NULL, 'Match starts at May 01, 14:00 GMT', 'T20'),
  ('api_d2cceca7-65d7-441e-8483-4505fd7cd073', 'cricket', 'ipl', '2026', '2026-05-02', NULL, 'chennai_super_kings', 'mumbai_indians', NULL, NULL, NULL, 'Match starts at May 02, 14:00 GMT', 'T20'),
  ('api_1153edf6-3ae1-4722-be1e-0256495b49cb', 'cricket', 'ipl', '2026', '2026-05-03', NULL, 'sunrisers_hyderabad', 'kolkata_knight_riders', NULL, NULL, NULL, 'Match starts at May 03, 10:00 GMT', 'T20'),
  ('api_f039998e-28b0-4445-b431-8bbccbbc6f1f', 'cricket', 'ipl', '2026', '2026-05-03', NULL, 'gujarat_titans', 'punjab_kings', NULL, NULL, NULL, 'Match starts at May 03, 14:00 GMT', 'T20'),
  ('api_ed18f7e9-d348-4ace-bfcd-9639096c6808', 'cricket', 'ipl', '2026', '2026-05-04', NULL, 'mumbai_indians', 'lucknow_super_giants', NULL, NULL, NULL, 'Match starts at May 04, 14:00 GMT', 'T20'),
  ('api_4804409b-28ee-4f3e-ab55-a4a4cb090198', 'cricket', 'ipl', '2026', '2026-05-05', NULL, 'delhi_capitals', 'chennai_super_kings', NULL, NULL, NULL, 'Match starts at May 05, 14:00 GMT', 'T20'),
  ('api_312ba6aa-5e93-4673-bb0c-cb207fdc9e2d', 'cricket', 'ipl', '2026', '2026-05-06', NULL, 'sunrisers_hyderabad', 'punjab_kings', NULL, NULL, NULL, 'Match starts at May 06, 14:00 GMT', 'T20'),
  ('api_8b326da3-8ff6-4e64-abe4-cb430d7a6c53', 'cricket', 'ipl', '2026', '2026-05-07', NULL, 'lucknow_super_giants', 'royal_challengers_bangalore', NULL, NULL, NULL, 'Match starts at May 07, 14:00 GMT', 'T20'),
  ('api_90d5c075-3c9a-40b7-ab45-80a36a3a2351', 'cricket', 'ipl', '2026', '2026-05-08', NULL, 'delhi_capitals', 'kolkata_knight_riders', NULL, NULL, NULL, 'Match starts at May 08, 14:00 GMT', 'T20'),
  ('api_6ffec712-6562-490c-a4fa-ae4b6ae59188', 'cricket', 'ipl', '2026', '2026-05-09', NULL, 'rajasthan_royals', 'gujarat_titans', NULL, NULL, NULL, 'Match starts at May 09, 14:00 GMT', 'T20'),
  ('api_6aced947-319c-4e4a-9214-6f94f14c043e', 'cricket', 'ipl', '2026', '2026-05-10', NULL, 'chennai_super_kings', 'lucknow_super_giants', NULL, NULL, NULL, 'Match starts at May 10, 10:00 GMT', 'T20'),
  ('api_02d3614d-9727-43c5-a80c-0bf46c7499c6', 'cricket', 'ipl', '2026', '2026-05-10', NULL, 'royal_challengers_bangalore', 'mumbai_indians', NULL, NULL, NULL, 'Match starts at May 10, 14:00 GMT', 'T20'),
  ('api_ee5ab0d9-acd2-42bf-b5bc-f4d287e0f434', 'cricket', 'ipl', '2026', '2026-05-11', NULL, 'punjab_kings', 'delhi_capitals', NULL, NULL, NULL, 'Match starts at May 11, 14:00 GMT', 'T20'),
  ('api_9413d7dd-bf8e-49f6-8ce7-91faf29a0115', 'cricket', 'ipl', '2026', '2026-05-12', NULL, 'gujarat_titans', 'sunrisers_hyderabad', NULL, NULL, NULL, 'Match starts at May 12, 14:00 GMT', 'T20'),
  ('api_0b3bab15-12b2-4a16-9f41-1096e40ff202', 'cricket', 'ipl', '2026', '2026-05-13', NULL, 'royal_challengers_bangalore', 'kolkata_knight_riders', NULL, NULL, NULL, 'Match starts at May 13, 14:00 GMT', 'T20'),
  ('api_6666db12-b9cc-49f0-b3af-5628fc8c53fa', 'cricket', 'ipl', '2026', '2026-05-14', NULL, 'punjab_kings', 'mumbai_indians', NULL, NULL, NULL, 'Match starts at May 14, 14:00 GMT', 'T20'),
  ('api_68746b1f-d4b0-4f0a-a46a-46a1946aae32', 'cricket', 'ipl', '2026', '2026-05-15', NULL, 'lucknow_super_giants', 'chennai_super_kings', NULL, NULL, NULL, 'Match starts at May 15, 14:00 GMT', 'T20'),
  ('api_166633a2-cecb-4cf3-a984-78dc898b5345', 'cricket', 'ipl', '2026', '2026-05-16', NULL, 'kolkata_knight_riders', 'gujarat_titans', NULL, NULL, NULL, 'Match starts at May 16, 14:00 GMT', 'T20'),
  ('api_288e3406-3692-400a-bc22-fb8cfa0db2ca', 'cricket', 'ipl', '2026', '2026-05-17', NULL, 'punjab_kings', 'royal_challengers_bangalore', NULL, NULL, NULL, 'Match starts at May 17, 10:00 GMT', 'T20'),
  ('api_990e89ea-3f6a-4196-ac73-7ad1a5f8c451', 'cricket', 'ipl', '2026', '2026-05-17', NULL, 'delhi_capitals', 'rajasthan_royals', NULL, NULL, NULL, 'Match starts at May 17, 14:00 GMT', 'T20'),
  ('api_8416c2a9-4a74-4ac2-a6ae-5ad2538cbc56', 'cricket', 'ipl', '2026', '2026-05-18', NULL, 'chennai_super_kings', 'sunrisers_hyderabad', NULL, NULL, NULL, 'Match starts at May 18, 14:00 GMT', 'T20'),
  ('api_3b225f44-ddf2-41d4-8079-7a3f81876e35', 'cricket', 'ipl', '2026', '2026-05-19', NULL, 'rajasthan_royals', 'lucknow_super_giants', NULL, NULL, NULL, 'Match starts at May 19, 14:00 GMT', 'T20'),
  ('api_5b1d59f9-51fd-449d-8cf1-9fc15ef15675', 'cricket', 'ipl', '2026', '2026-05-20', NULL, 'kolkata_knight_riders', 'mumbai_indians', NULL, NULL, NULL, 'Match starts at May 20, 14:00 GMT', 'T20'),
  ('api_fd660ab1-c4bf-4c0f-b1b9-7232361cd1e8', 'cricket', 'ipl', '2026', '2026-05-21', NULL, 'gujarat_titans', 'chennai_super_kings', NULL, NULL, NULL, 'Match starts at May 21, 14:00 GMT', 'T20'),
  ('api_bf23431b-ba1c-4147-94d9-b8d361a3ce9e', 'cricket', 'ipl', '2026', '2026-05-22', NULL, 'sunrisers_hyderabad', 'royal_challengers_bangalore', NULL, NULL, NULL, 'Match starts at May 22, 14:00 GMT', 'T20'),
  ('api_7134216b-553c-4099-82a8-ee48bd9c46f3', 'cricket', 'ipl', '2026', '2026-05-23', NULL, 'lucknow_super_giants', 'punjab_kings', NULL, NULL, NULL, 'Match starts at May 23, 14:00 GMT', 'T20'),
  ('api_c0d94cec-8a67-4414-80af-81e7d4a9ee9a', 'cricket', 'ipl', '2026', '2026-05-24', NULL, 'mumbai_indians', 'rajasthan_royals', NULL, NULL, NULL, 'Match starts at May 24, 10:00 GMT', 'T20'),
  ('api_8f61d649-f53b-4e79-9bfb-661cfe69be3b', 'cricket', 'ipl', '2026', '2026-05-24', NULL, 'kolkata_knight_riders', 'delhi_capitals', NULL, NULL, NULL, 'Match starts at May 24, 14:00 GMT', 'T20')
ON CONFLICT (match_id) DO UPDATE SET
  sport_id = EXCLUDED.sport_id,
  league_id = EXCLUDED.league_id,
  season = EXCLUDED.season,
  match_date = EXCLUDED.match_date,
  venue_id = EXCLUDED.venue_id,
  team1_id = EXCLUDED.team1_id,
  team2_id = EXCLUDED.team2_id,
  result = EXCLUDED.result,
  match_type = EXCLUDED.match_type
WHERE public.matches.winner IS NULL;
