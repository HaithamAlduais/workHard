-- Demo athlete data
-- Run after creating a user and replacing DEMO_USER_ID with the actual UUID.

-- Uncomment and replace UUID before running:
-- INSERT INTO profiles (id, name, locale, unit_system, timezone, bodyweight_kg, training_experience, current_program_mode)
-- VALUES ('DEMO_USER_ID', 'Demo Alex', 'en', 'metric', 'UTC', 80, 'intermediate', 'HYBRID_FOUNDATION');

-- Demo equipment inventory
-- INSERT INTO equipment_inventory (user_id, equipment_id, owned) VALUES
-- ('DEMO_USER_ID', 'pull-up-bar', true),
-- ('DEMO_USER_ID', 'rings', true),
-- ('DEMO_USER_ID', 'weight-vest', true),
-- ('DEMO_USER_ID', 'dip-belt', true),
-- ('DEMO_USER_ID', 'plates', true),
-- ('DEMO_USER_ID', 'barbell', true),
-- ('DEMO_USER_ID', 'bench', true),
-- ('DEMO_USER_ID', 'squat-rack', true);

-- Demo skill unlocks
-- INSERT INTO skill_unlocks (user_id, skill_node_id, unlock_status, unlocked_at) VALUES
-- ('DEMO_USER_ID', 'active-hang', 'mastered', now()),
-- ('DEMO_USER_ID', 'scapular-pull-up', 'mastered', now()),
-- ('DEMO_USER_ID', 'assisted-pull-up', 'unlocked', now()),
-- ('DEMO_USER_ID', 'strict-pull-up', 'unlocked', now()),
-- ('DEMO_USER_ID', 'handstand-wall', 'unlocked', now()),
-- ('DEMO_USER_ID', 'ring-push-up', 'unlocked', now()),
-- ('DEMO_USER_ID', 'box-pistol', 'unlocked', now()),
-- ('DEMO_USER_ID', 'tuck-front-lever', 'unlocked', now());

-- Demo movement pattern readiness
-- INSERT INTO movement_pattern_readiness (user_id, movement_pattern_id, readiness_status, supporting_exercise_or_skill, equipment_ready, performance_ready, volume_ready, time_ready, pain_free) VALUES
-- ('DEMO_USER_ID', 'VERTICAL_PULL', 'READY', 'Weighted Pull-up', true, true, true, true, true),
-- ('DEMO_USER_ID', 'HORIZONTAL_PULL', 'READY', 'Front-lever row progression', true, true, true, true, true),
-- ('DEMO_USER_ID', 'VERTICAL_PUSH', 'NOT_READY', 'Wall HSPU', true, false, true, true, true),
-- ('DEMO_USER_ID', 'HORIZONTAL_PUSH', 'NOT_READY', 'Weighted Ring Push-up', true, false, true, true, true),
-- ('DEMO_USER_ID', 'KNEE_DOMINANT', 'NOT_READY', 'Weighted Pistol', true, false, true, true, true),
-- ('DEMO_USER_ID', 'KNEE_FLEXION', 'NOT_READY', 'Nordic curl', false, false, true, true, true),
-- ('DEMO_USER_ID', 'GRIP', 'READY', 'Towel dead hang', true, true, true, true, true);

-- Demo graduation contract
-- INSERT INTO graduation_contracts (id, user_id, template_type, status)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'DEMO_USER_ID', 'PRACTICAL_HOME_INDEPENDENCE', 'active');
