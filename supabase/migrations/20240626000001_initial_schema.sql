-- GravityPath initial schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Application settings (single-row config)
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name text NOT NULL DEFAULT 'GravityPath',
  default_locale text NOT NULL DEFAULT 'en',
  supported_locales text[] NOT NULL DEFAULT ARRAY['en', 'ar'],
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  locale text NOT NULL DEFAULT 'en',
  unit_system text NOT NULL DEFAULT 'metric',
  timezone text NOT NULL DEFAULT 'UTC',
  first_day_of_week smallint NOT NULL DEFAULT 1,
  bodyweight_kg numeric(6,2),
  height_cm numeric(6,2),
  gender text,
  training_experience text,
  current_program_mode text NOT NULL DEFAULT 'HYBRID_FOUNDATION',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Equipment inventory
CREATE TABLE IF NOT EXISTS equipment (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text,
  category text NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  equipment_id text NOT NULL REFERENCES equipment(id),
  owned boolean NOT NULL DEFAULT false,
  quantity integer DEFAULT 1,
  UNIQUE (user_id, equipment_id)
);

-- Exercise library
CREATE TABLE IF NOT EXISTS muscles (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text
);

CREATE TABLE IF NOT EXISTS movement_patterns (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id text PRIMARY KEY,
  movement_pattern_id text NOT NULL REFERENCES movement_patterns(id),
  name text NOT NULL,
  name_ar text,
  role text NOT NULL,
  order_class text NOT NULL,
  requires_gym boolean NOT NULL DEFAULT false,
  can_be_replaced boolean NOT NULL DEFAULT false,
  default_warmup_seconds integer NOT NULL DEFAULT 120,
  default_working_set_seconds integer NOT NULL DEFAULT 60,
  transition_seconds integer NOT NULL DEFAULT 60,
  video_url text
);

CREATE TABLE IF NOT EXISTS exercise_equipment (
  exercise_id text NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  equipment_id text NOT NULL REFERENCES equipment(id),
  PRIMARY KEY (exercise_id, equipment_id)
);

CREATE TABLE IF NOT EXISTS exercise_muscles (
  exercise_id text NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  muscle_id text NOT NULL REFERENCES muscles(id),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (exercise_id, muscle_id)
);

-- Skill graph
CREATE TABLE IF NOT EXISTS skill_families (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ar text,
  description text,
  movement_pattern text,
  default_risk_level text NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS skill_nodes (
  id text PRIMARY KEY,
  skill_family_id text NOT NULL REFERENCES skill_families(id),
  name text NOT NULL,
  name_ar text,
  stage integer NOT NULL DEFAULT 0,
  difficulty text NOT NULL,
  apparatus text[] NOT NULL DEFAULT '{}',
  static_or_dynamic text NOT NULL,
  bent_or_straight_arm text NOT NULL,
  role text NOT NULL,
  risk_level text NOT NULL,
  target_dose jsonb NOT NULL DEFAULT '{}',
  target_quality numeric(3,2) NOT NULL DEFAULT 0.7,
  unlock_rule jsonb NOT NULL DEFAULT '{}',
  regress_rule jsonb NOT NULL DEFAULT '{}',
  volume_rule text NOT NULL DEFAULT 'TECHNIQUE_NO_VOLUME',
  technique_cues text[] DEFAULT '{}',
  safety_cues text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS skill_edges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id text NOT NULL REFERENCES skill_nodes(id),
  to_node_id text NOT NULL REFERENCES skill_nodes(id),
  edge_type text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  conditions jsonb DEFAULT '{}'
);

-- Programs
CREATE TABLE IF NOT EXISTS program_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_days (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_version_id uuid NOT NULL REFERENCES program_versions(id),
  day_number integer NOT NULL,
  name text,
  target_duration_minutes integer NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_day_id uuid NOT NULL REFERENCES program_days(id),
  exercise_id text REFERENCES exercise_library(id),
  skill_node_id text REFERENCES skill_nodes(id),
  order_index integer NOT NULL,
  pair_id text,
  pair_type text,
  sets integer,
  reps_min integer,
  reps_max integer,
  hold_seconds_min integer,
  hold_seconds_max integer,
  rest_seconds integer,
  rir_target integer,
  order_class text,
  role text,
  tier integer NOT NULL DEFAULT 3
);

-- User schedule and sessions
CREATE TABLE IF NOT EXISTS schedule_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_days integer[] NOT NULL DEFAULT ARRAY[1,3,5],
  preferred_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_day_id uuid NOT NULL REFERENCES program_days(id),
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  sequence_number integer NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_version_id uuid REFERENCES program_versions(id),
  program_day_id uuid REFERENCES program_days(id),
  scheduled_session_id uuid REFERENCES scheduled_sessions(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  elapsed_seconds integer,
  client_id text
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id text REFERENCES exercise_library(id),
  skill_node_id text REFERENCES skill_nodes(id),
  order_index integer NOT NULL,
  pair_id text,
  pair_type text,
  target_sets integer,
  target_reps_min integer,
  target_reps_max integer,
  target_load_kg numeric(8,2),
  target_hold_seconds integer,
  role text,
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS set_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_exercise_id uuid NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  load_kg numeric(8,2),
  repetitions integer,
  rir integer,
  rom text,
  form text,
  pain_level smallint NOT NULL DEFAULT 0,
  rest_seconds_planned integer,
  rest_seconds_actual integer,
  completed_at timestamptz,
  video_id uuid,
  client_id text,
  notes text
);

CREATE TABLE IF NOT EXISTS skill_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  skill_node_id text NOT NULL REFERENCES skill_nodes(id),
  exercise_variant_id text,
  attempt_number integer,
  repetitions integer,
  hold_seconds integer,
  valid_hold_seconds integer,
  external_load_kg numeric(8,2) DEFAULT 0,
  assistance text,
  leverage_level text,
  load_placement text,
  apparatus text,
  quality_score numeric(3,2),
  quality_dimensions jsonb,
  pain_level smallint NOT NULL DEFAULT 0,
  full_rom boolean DEFAULT true,
  result_status text,
  video_id uuid,
  client_id text,
  completed_at timestamptz,
  video_verified boolean DEFAULT false,
  coach_verified boolean DEFAULT false,
  self_reported boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS skill_unlocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_node_id text NOT NULL REFERENCES skill_nodes(id),
  unlock_status text NOT NULL DEFAULT 'locked',
  evidence_type text,
  supporting_attempt_ids uuid[],
  verified_by text,
  unlocked_at timestamptz,
  UNIQUE (user_id, skill_node_id)
);

CREATE TABLE IF NOT EXISTS skill_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_family_id text NOT NULL REFERENCES skill_families(id),
  target_node_id text REFERENCES skill_nodes(id),
  priority_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS skill_specialization_cycles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  primary_skill_family_id text NOT NULL REFERENCES skill_families(id),
  secondary_skill_family_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active'
);

-- Program replacements
CREATE TABLE IF NOT EXISTS program_replacements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_gym_exercise_id text NOT NULL REFERENCES exercise_library(id),
  target_calisthenics_node_id text NOT NULL REFERENCES skill_nodes(id),
  replacement_percentage integer NOT NULL DEFAULT 0,
  rationale text,
  effective_date date NOT NULL,
  ended_at date
);

-- Graduation
CREATE TABLE IF NOT EXISTS graduation_contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  custom_requirements jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS graduation_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES graduation_contracts(id),
  transition_start date NOT NULL,
  graduation_date date,
  home_program_version_id uuid REFERENCES program_versions(id)
);

CREATE TABLE IF NOT EXISTS movement_pattern_readiness (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  movement_pattern_id text NOT NULL REFERENCES movement_patterns(id),
  readiness_status text NOT NULL DEFAULT 'NOT_READY',
  supporting_exercise_or_skill text,
  equipment_ready boolean DEFAULT false,
  performance_ready boolean DEFAULT false,
  volume_ready boolean DEFAULT false,
  time_ready boolean DEFAULT false,
  pain_free boolean DEFAULT true,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movement_pattern_id)
);

-- Volume, readiness, pain
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  completed_sessions integer,
  adherence numeric(4,2),
  average_duration_minutes integer,
  volume_by_muscle jsonb,
  skill_exposures jsonb,
  recommendations jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS joint_status_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  joint_area text NOT NULL,
  pain_level smallint NOT NULL DEFAULT 0,
  stiffness smallint DEFAULT 0,
  recovery_hours integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text,
  duration integer,
  angle text,
  privacy text NOT NULL DEFAULT 'private',
  upload_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  assessor_type text NOT NULL,
  model_version text,
  confidence numeric(3,2),
  assessment_data jsonb,
  user_confirmed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coach and notifications
CREATE TABLE IF NOT EXISTS coach_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'deterministic',
  message text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_specialization_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_pattern_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own equipment" ON equipment_inventory USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own schedule" ON schedule_preferences USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON workout_sessions USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own session exercises" ON session_exercises USING (auth.uid() IN (SELECT user_id FROM workout_sessions WHERE workout_sessions.id = session_exercises.workout_session_id));
CREATE POLICY "Users can manage own set logs" ON set_logs USING (auth.uid() IN (SELECT ws.user_id FROM workout_sessions ws JOIN session_exercises se ON ws.id = se.workout_session_id WHERE se.id = set_logs.session_exercise_id));
CREATE POLICY "Users can manage own skill attempts" ON skill_attempts USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skill unlocks" ON skill_unlocks USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skill goals" ON skill_goals USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skill cycles" ON skill_specialization_cycles USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own replacements" ON program_replacements USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contracts" ON graduation_contracts USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own readiness" ON movement_pattern_readiness USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reviews" ON weekly_reviews USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own joint logs" ON joint_status_logs USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own videos" ON videos USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own form assessments" ON form_assessments USING (auth.uid() IN (SELECT user_id FROM videos WHERE videos.id = form_assessments.video_id));
CREATE POLICY "Users can manage own coach messages" ON coach_messages USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications USING (auth.uid() = user_id);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, locale, unit_system, timezone)
  VALUES (new.id, 'en', 'metric', 'UTC');
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
