-- GravityPath offline-sync migration: client_id columns and progression_decisions

-- Add client_id columns for idempotent mobile-to-backend sync.
ALTER TABLE program_days ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE skill_attempts ADD COLUMN IF NOT EXISTS client_id text;

-- Seed program_days client_ids to match the mobile curriculum ids (day1, day2, day3).
UPDATE program_days
SET client_id = 'day' || day_number::text
WHERE client_id IS NULL AND day_number IN (1, 2, 3);

-- Unique indexes enforce deterministic upserts by client_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_days_client_id ON program_days(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_exercises_client_id ON session_exercises(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_set_logs_client_id ON set_logs(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_attempts_client_id ON skill_attempts(client_id);

-- Foreign-key lookup indexes for sync and cascading reads.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_workout_session_id ON session_exercises(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_exercise_id ON set_logs(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_skill_attempts_workout_session_id ON skill_attempts(workout_session_id);

-- Mobile progression decisions (per-session, per-exercise targets).
CREATE TABLE IF NOT EXISTS progression_decisions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id text,
  skill_node_id text,
  decision_type text NOT NULL,
  target_node_id text,
  new_target jsonb,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  client_id text UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_progression_decisions_client_id ON progression_decisions(client_id);
CREATE INDEX IF NOT EXISTS idx_progression_decisions_user_id ON progression_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_progression_decisions_workout_session_id ON progression_decisions(workout_session_id);

-- RLS
ALTER TABLE progression_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progression decisions" ON progression_decisions
  USING (auth.uid() = user_id);
