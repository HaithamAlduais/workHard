-- Grant minimum privileges for local Supabase API users.
-- Authenticated users own their rows via RLS; anon users can read reference data.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- Reference / lookup tables (read-only for anon and authenticated)
GRANT SELECT ON TABLE
  app_settings,
  equipment,
  muscles,
  movement_patterns,
  exercise_library,
  exercise_equipment,
  exercise_muscles,
  skill_families,
  skill_nodes,
  skill_edges,
  program_versions,
  program_days,
  program_exercises
TO anon, authenticated;

-- User-owned tables (full access for authenticated, no access for anon)
GRANT ALL ON TABLE
  profiles,
  equipment_inventory,
  schedule_preferences,
  scheduled_sessions,
  workout_sessions,
  session_exercises,
  set_logs,
  skill_attempts,
  skill_unlocks,
  skill_goals,
  skill_specialization_cycles,
  program_replacements,
  graduation_contracts,
  graduation_events,
  movement_pattern_readiness,
  weekly_reviews,
  joint_status_logs,
  videos,
  form_assessments,
  coach_messages,
  notifications,
  audit_events,
  exercise_prescriptions,
  skill_prescriptions,
  progression_decisions
TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
