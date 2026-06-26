-- Prescription persistence tables

CREATE TABLE IF NOT EXISTS exercise_prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  exercise_id text NOT NULL,
  program_day_id text NOT NULL,
  current_load numeric,
  next_load numeric,
  set_count int,
  target_reps_min int,
  target_reps_max int,
  exact_next_targets int[],
  target_rir int,
  rest_seconds int,
  body_region text,
  smallest_plate_kg numeric,
  progression_state text,
  last_completed_session_id text,
  last_decision_id text,
  active_deload boolean DEFAULT false,
  active_set_addition boolean DEFAULT false,
  override_status jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_id text UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_user_id ON exercise_prescriptions(user_id);

CREATE TABLE IF NOT EXISTS skill_prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  skill_node_id text NOT NULL,
  skill_family_id text NOT NULL,
  current_node text,
  next_candidate_node text,
  target_sets int,
  target_reps_or_hold_seconds int,
  assistance text,
  leverage_level text,
  external_load numeric,
  load_placement text,
  apparatus text,
  grip text,
  modifiers jsonb,
  quality_target numeric,
  required_successful_exposures int,
  progression_state text,
  last_completed_exposure text,
  active_safety_hold boolean DEFAULT false,
  override_status jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_id text UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_prescriptions_user_id ON skill_prescriptions(user_id);

ALTER TABLE exercise_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own exercise prescriptions"
  ON exercise_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise prescriptions"
  ON exercise_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise prescriptions"
  ON exercise_prescriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own skill prescriptions"
  ON skill_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill prescriptions"
  ON skill_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill prescriptions"
  ON skill_prescriptions FOR UPDATE
  USING (auth.uid() = user_id);
