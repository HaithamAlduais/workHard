# GravityPath Database

## Platform

PostgreSQL via Supabase.

## Core Tables

- `profiles` — user profile, locale, units
- `equipment_inventory` — user-owned equipment
- `exercise_library` — canonical exercises with roles and order classes
- `exercise_muscles`, `exercise_equipment` — mappings
- `movement_patterns` — vertical push, horizontal pull, etc.
- `skill_families`, `skill_nodes`, `skill_edges` — calisthenics skill graph
- `program_versions`, `program_days`, `program_exercises` — immutable program prescriptions
- `workout_sessions`, `session_exercises`, `set_logs` — logged training
- `skill_attempts`, `skill_unlocks` — skill practice and unlock state
- `program_replacements` — gym-to-calisthenics replacements
- `graduation_contracts`, `graduation_events` — graduation tracking
- `movement_pattern_readiness` — home readiness matrix
- `videos`, `form_assessments` — video logging and optional CV analysis
- `weekly_reviews`, `coach_messages`, `notifications`

## Security

Row Level Security enabled on all user tables. Policies restrict access to the authenticated owner.

## Migrations & Seed

```bash
supabase migration up
supabase seed run
```

Seed includes the three-day hybrid program, skill graph, equipment, muscles, and movement patterns.
