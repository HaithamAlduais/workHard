-- GravityPath seed data
-- Movement patterns
INSERT INTO movement_patterns (id, name, name_ar) VALUES
('VERTICAL_PUSH', 'Vertical Push', 'دفع رأسي'),
('VERTICAL_PULL', 'Vertical Pull', 'سحب رأسي'),
('HORIZONTAL_PUSH', 'Horizontal Push', 'دفع أفقي'),
('HORIZONTAL_PULL', 'Horizontal Pull', 'سحب أفقي'),
('KNEE_DOMINANT', 'Knee Dominant', 'سيطرة الركبة'),
('HIP_HINGE', 'Hip Hinge', 'مفصل الورك'),
('KNEE_FLEXION', 'Knee Flexion', 'ثني الركبة'),
('CALF', 'Calf', 'السمانة'),
('CORE_COMPRESSION', 'Core Compression', 'انضغاط الجذع'),
('GRIP', 'Grip', 'القبضة'),
('LOWER_BODY_POWER', 'Lower Body Power', 'قوة الجزء السفلي'),
('UPPER_BODY_POWER', 'Upper Body Power', 'قوة الجزء العلوي')
ON CONFLICT (id) DO NOTHING;

-- Muscles
INSERT INTO muscles (id, name, name_ar) VALUES
('chest', 'Chest', 'الصدر'),
('lats', 'Lats', 'الظهر العريض'),
('upper-back', 'Upper Back', 'الظهر العلوي'),
('quadriceps', 'Quadriceps', 'الرباعية'),
('hamstrings', 'Hamstrings', 'الأوتار الخلفية'),
('glutes', 'Glutes', 'الألوية'),
('anterior-deltoids', 'Anterior Deltoids', 'الأمامية'),
('lateral-deltoids', 'Lateral Deltoids', 'الجانبية'),
('rear-deltoids', 'Rear Deltoids', 'الخلفية'),
('biceps', 'Biceps', 'العضلة ذات الرأسين'),
('triceps', 'Triceps', 'العضلة ثلاثية الرؤوس'),
('brachialis', 'Brachialis', 'الباشيالية'),
('forearms', 'Forearms', 'الساعدين'),
('grip', 'Grip', 'القبضة'),
('calves', 'Calves', 'السمانة'),
('trunk', 'Trunk', 'الجذع'),
('hip-flexors', 'Hip Flexors', 'ثني الورك'),
('scapular-stabilizers', 'Scapular Stabilizers', 'مثبتات الكتف')
ON CONFLICT (id) DO NOTHING;

-- Equipment
INSERT INTO equipment (id, name, name_ar, category) VALUES
('barbell', 'Barbell', 'بار أولمبي', 'gym'),
('dumbbells', 'Dumbbells', 'دمبل', 'gym'),
('bench', 'Bench', 'مقعد', 'gym'),
('squat-rack', 'Squat Rack', 'رف القرفصاء', 'gym'),
('cable', 'Cable Machine', 'جهاز الكابل', 'gym'),
('leg-curl', 'Leg Curl Machine', 'جهاز ثني الركبة', 'gym'),
('leg-extension', 'Leg Extension Machine', 'جهاز بسط الركبة', 'gym'),
('hack-squat', 'Hack Squat Machine', 'جهاز القرفصاء', 'gym'),
('calf-machine', 'Calf Machine', 'جهاز السمانة', 'gym'),
('trap-bar', 'Trap Bar', 'بار سداسي', 'gym'),
('medicine-ball', 'Medicine Ball', 'كرة طبية', 'gym'),
('box', 'Plyo Box', 'صندوق قفز', 'gym'),
('pull-up-bar', 'Pull-up Bar', 'بار سحب', 'home'),
('rings', 'Gymnastic Rings', 'حلقات جمباز', 'home'),
('parallettes', 'Parallettes', 'باراليتس', 'home'),
('dip-bars', 'Dip Bars', 'باران تمرين', 'home'),
('bands', 'Resistance Bands', 'أربطة مقاومة', 'home'),
('weight-vest', 'Weight Vest', 'سترة وزن', 'home'),
('dip-belt', 'Dip Belt', 'حزام وزن', 'home'),
('plates', 'Weight Plates', 'أقراص وزن', 'shared'),
('backpack', 'Loading Backpack', 'حقيبة تحميل', 'home'),
('nordic-anchor', 'Nordic Anchor', 'مرساة نورديك', 'home'),
('sliders', 'Sliders', 'زلاقات', 'home'),
('exercise-mat', 'Exercise Mat', 'بساط تمارين', 'home'),
('wall', 'Safe Wall Space', 'جدار آمن', 'home'),
('park', 'Outdoor Park Access', 'حديقة خارجية', 'home')
ON CONFLICT (id) DO NOTHING;

-- Exercises
INSERT INTO exercise_library (id, movement_pattern_id, name, name_ar, role, order_class, requires_gym, can_be_replaced, default_warmup_seconds, default_working_set_seconds, transition_seconds) VALUES
-- Day 1
('back-squat', 'KNEE_DOMINANT', 'Back Squat', 'قرفصاء خلفية', 'STRENGTH_PRIMARY', 'GYM_STRENGTH', true, true, 240, 60, 120),
('weighted-pull-up', 'VERTICAL_PULL', 'Weighted Pull-up', 'سحب مع وزن', 'STRENGTH_AND_HYPERTROPHY', 'GYM_STRENGTH', false, true, 120, 50, 90),
('bench-press', 'HORIZONTAL_PUSH', 'Barbell Bench Press', 'ضغط صدر بالبار', 'STRENGTH_AND_HYPERTROPHY', 'GYM_STRENGTH', true, true, 180, 60, 90),
('seated-leg-curl', 'KNEE_FLEXION', 'Seated Leg Curl', 'ثني ركبة جالس', 'HYPERTROPHY_PRIMARY', 'GYM_HYPERTROPHY', true, false, 60, 40, 45),
('cable-lateral-raise', 'CORE_COMPRESSION', 'Cable Lateral Raise', 'رفع جانبي بالكابل', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('ez-curl', 'GRIP', 'EZ-bar Curl', 'كيرل بالبار EZ', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('triceps-pressdown', 'GRIP', 'Rope Triceps Pressdown', 'ضغط ثلاثي بالحبل', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('standing-calf-raise', 'CALF', 'Standing Calf Raise', 'رفع سمانة واقف', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('farmers-carry', 'GRIP', 'Farmers Carry', 'حمل المزارع', 'STRENGTH_AND_HYPERTROPHY', 'ACCESSORY', true, false, 60, 30, 30),
('box-jump', 'LOWER_BODY_POWER', 'Box Jump', 'قفز على صندوق', 'POWER_ONLY', 'POWER', true, false, 120, 20, 90),
-- Day 2
('trap-bar-deadlift', 'HIP_HINGE', 'Trap-bar Deadlift', 'رفعة ميتة ببار سداسي', 'STRENGTH_PRIMARY', 'GYM_STRENGTH', true, true, 240, 60, 120),
('overhead-press', 'VERTICAL_PUSH', 'Standing Overhead Press', 'دفع كتف واقف', 'STRENGTH_AND_HYPERTROPHY', 'GYM_STRENGTH', true, true, 180, 60, 90),
('chest-supported-row', 'HORIZONTAL_PULL', 'Chest-supported Row', 'سحب مدعوم بالصدر', 'STRENGTH_AND_HYPERTROPHY', 'GYM_STRENGTH', true, true, 120, 50, 75),
('hack-squat', 'KNEE_DOMINANT', 'Hack Squat', 'قرفصاء هاك', 'STRENGTH_AND_HYPERTROPHY', 'GYM_HYPERTROPHY', true, false, 120, 50, 75),
('lying-leg-curl', 'KNEE_FLEXION', 'Lying Leg Curl', 'ثني ركبة مستلق', 'HYPERTROPHY_PRIMARY', 'GYM_HYPERTROPHY', true, false, 60, 40, 45),
('ring-push-up', 'HORIZONTAL_PUSH', 'Ring Push-up', 'ضغط بالحلقات', 'STRENGTH_AND_HYPERTROPHY', 'HYPERTROPHY_SKILL', false, true, 120, 50, 75),
('lat-pulldown', 'VERTICAL_PULL', 'Lat Pulldown', 'سحب علوي', 'HYPERTROPHY_PRIMARY', 'GYM_HYPERTROPHY', true, true, 120, 50, 60),
('plate-pinch', 'GRIP', 'Plate Pinch', 'قرص القبضة', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 30, 30),
('medicine-ball-throw', 'UPPER_BODY_POWER', 'Medicine-ball Chest Throw', 'رمي كرة طبية', 'POWER_ONLY', 'POWER', true, false, 120, 20, 60),
-- Day 3
('front-squat', 'KNEE_DOMINANT', 'Front Squat', 'قرفصاء أمامية', 'STRENGTH_PRIMARY', 'GYM_STRENGTH', true, true, 240, 60, 120),
('low-incline-press', 'HORIZONTAL_PUSH', 'Low-incline Bench Press', 'ضغط مائل منخفض', 'STRENGTH_AND_HYPERTROPHY', 'GYM_STRENGTH', true, true, 180, 60, 90),
('romanian-deadlift', 'HIP_HINGE', 'Romanian Deadlift', 'رفعة رومانية', 'STRENGTH_AND_HYPERTROPHY', 'GYM_HYPERTROPHY', true, true, 120, 50, 75),
('reverse-pec-deck', 'HORIZONTAL_PULL', 'Reverse Pec Deck', 'بيك ديك عكسي', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('leg-extension', 'KNEE_DOMINANT', 'Leg Extension', 'بسط الركبة', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('reverse-curl', 'GRIP', 'Reverse Curl', 'كيرل عكسي', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('cable-triceps-pressdown', 'GRIP', 'Cable Triceps Pressdown', 'ضغط ثلاثي بالكابل', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', true, false, 60, 40, 30),
('single-leg-calf-raise', 'CALF', 'Single-leg Calf Raise', 'رفع سمانة برجل واحدة', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', false, false, 60, 40, 30),
('towel-dead-hang', 'GRIP', 'Towel Dead Hang', 'تعليق بالمنشفة', 'HYPERTROPHY_PRIMARY', 'ACCESSORY', false, false, 60, 30, 30),
('trap-bar-jump', 'LOWER_BODY_POWER', 'Trap-bar Jump', 'قفز بالبار السداسي', 'POWER_ONLY', 'POWER', true, false, 120, 20, 90)
ON CONFLICT (id) DO NOTHING;

-- Exercise muscles (primary)
INSERT INTO exercise_muscles (exercise_id, muscle_id, is_primary) VALUES
('back-squat', 'quadriceps', true),
('back-squat', 'glutes', false),
('weighted-pull-up', 'lats', true),
('weighted-pull-up', 'biceps', false),
('bench-press', 'chest', true),
('bench-press', 'triceps', false),
('bench-press', 'anterior-deltoids', false),
('seated-leg-curl', 'hamstrings', true),
('cable-lateral-raise', 'lateral-deltoids', true),
('ez-curl', 'biceps', true),
('triceps-pressdown', 'triceps', true),
('standing-calf-raise', 'calves', true),
('farmers-carry', 'grip', true),
('box-jump', 'quadriceps', true),
('trap-bar-deadlift', 'hamstrings', true),
('trap-bar-deadlift', 'glutes', true),
('overhead-press', 'anterior-deltoids', true),
('overhead-press', 'triceps', false),
('chest-supported-row', 'upper-back', true),
('chest-supported-row', 'lats', false),
('hack-squat', 'quadriceps', true),
('lying-leg-curl', 'hamstrings', true),
('ring-push-up', 'chest', true),
('ring-push-up', 'triceps', false),
('lat-pulldown', 'lats', true),
('plate-pinch', 'grip', true),
('medicine-ball-throw', 'chest', true),
('front-squat', 'quadriceps', true),
('front-squat', 'glutes', false),
('low-incline-press', 'chest', true),
('low-incline-press', 'anterior-deltoids', false),
('romanian-deadlift', 'hamstrings', true),
('romanian-deadlift', 'glutes', false),
('reverse-pec-deck', 'rear-deltoids', true),
('leg-extension', 'quadriceps', true),
('reverse-curl', 'brachialis', true),
('cable-triceps-pressdown', 'triceps', true),
('single-leg-calf-raise', 'calves', true),
('towel-dead-hang', 'grip', true),
('trap-bar-jump', 'quadriceps', true)
ON CONFLICT (exercise_id, muscle_id) DO NOTHING;

-- Exercise equipment
INSERT INTO exercise_equipment (exercise_id, equipment_id) VALUES
('back-squat', 'barbell'), ('back-squat', 'squat-rack'),
('weighted-pull-up', 'pull-up-bar'), ('weighted-pull-up', 'dip-belt'), ('weighted-pull-up', 'plates'),
('bench-press', 'barbell'), ('bench-press', 'bench'),
('seated-leg-curl', 'leg-curl'),
('cable-lateral-raise', 'cable'),
('ez-curl', 'barbell'), ('ez-curl', 'plates'),
('triceps-pressdown', 'cable'),
('standing-calf-raise', 'calf-machine'),
('farmers-carry', 'dumbbells'),
('box-jump', 'box'),
('trap-bar-deadlift', 'trap-bar'), ('trap-bar-deadlift', 'plates'),
('overhead-press', 'barbell'), ('overhead-press', 'plates'),
('chest-supported-row', 'bench'), ('chest-supported-row', 'dumbbells'),
('hack-squat', 'hack-squat'),
('lying-leg-curl', 'leg-curl'),
('ring-push-up', 'rings'),
('lat-pulldown', 'cable'),
('plate-pinch', 'plates'),
('medicine-ball-throw', 'medicine-ball'),
('front-squat', 'barbell'), ('front-squat', 'squat-rack'),
('low-incline-press', 'barbell'), ('low-incline-press', 'bench'),
('romanian-deadlift', 'barbell'), ('romanian-deadlift', 'plates'),
('reverse-pec-deck', 'cable'),
('leg-extension', 'leg-extension'),
('reverse-curl', 'barbell'), ('reverse-curl', 'plates'),
('cable-triceps-pressdown', 'cable'),
('single-leg-calf-raise', 'box'),
('towel-dead-hang', 'pull-up-bar'),
('trap-bar-jump', 'trap-bar'), ('trap-bar-jump', 'plates')
ON CONFLICT (exercise_id, equipment_id) DO NOTHING;

-- Skill families
INSERT INTO skill_families (id, name, name_ar, description, movement_pattern, default_risk_level) VALUES
('pull-up', 'Pull-up & Weighted Pull-up', 'السحب والسحب بالوزن', 'Vertical pulling strength and weighted progression', 'VERTICAL_PULL', 'medium'),
('muscle-up', 'Muscle-up', 'العضلة العكسية', 'Bar and ring muscle-up', 'VERTICAL_PULL', 'high'),
('handstand', 'Handstand & HSPU', 'الوقوف على اليدين والدفع', 'Balance and pressing in inversion', 'VERTICAL_PUSH', 'high'),
('ring-push-up', 'Ring Push-up', 'الضغط بالحلقات', 'Ring stabilization and horizontal pressing', 'HORIZONTAL_PUSH', 'medium'),
('pistol', 'Pistol Squat', 'القرفصاء برجل واحدة', 'Single-leg squat balance and strength', 'KNEE_DOMINANT', 'medium'),
('front-lever', 'Front Lever', 'الرافعة الأمامية', 'Straight-arm front lever', 'HORIZONTAL_PULL', 'high'),
('back-lever', 'Back Lever', 'الرافعة الخلفية', 'Straight-arm back lever', 'HORIZONTAL_PULL', 'high'),
('planche', 'Planche', 'البلانش', 'Straight-arm planche', 'HORIZONTAL_PUSH', 'high'),
('l-sit', 'L-sit & Compression', 'الجلوس L والانضغاط', 'Compression and hip flexor strength', 'CORE_COMPRESSION', 'low'),
('expert-rings', 'Expert Ring Branches', 'فروع الحلقات المتقدمة', 'Iron cross, Maltese, Victorian', 'HORIZONTAL_PUSH', 'expert')
ON CONFLICT (id) DO NOTHING;

-- Skill nodes (simplified essential graph)
INSERT INTO skill_nodes (id, skill_family_id, name, name_ar, stage, difficulty, apparatus, static_or_dynamic, bent_or_straight_arm, role, risk_level, target_dose, target_quality, unlock_rule, regress_rule, volume_rule) VALUES
-- Pull-up tree
('active-hang', 'pull-up', 'Active Hang', 'تعليق نشط', 1, 'fundamental', ARRAY['pull-up-bar'], 'static', 'straight', 'technique', 'low', '{"sets": 3, "holdSecondsMin": 15, "holdSecondsMax": 30}', 0.7, '{"requiredExposures": 2, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'TECHNIQUE_NO_VOLUME'),
('scapular-pull-up', 'pull-up', 'Scapular Pull-up', 'سحب كتفي', 2, 'fundamental', ARRAY['pull-up-bar'], 'dynamic', 'bent', 'technique', 'low', '{"sets": 3, "repsMin": 5, "repsMax": 8}', 0.7, '{"requiredExposures": 2, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'TECHNIQUE_NO_VOLUME'),
('assisted-pull-up', 'pull-up', 'Assisted Pull-up', 'سحب مساعد', 3, 'beginner', ARRAY['pull-up-bar', 'bands'], 'dynamic', 'bent', 'skill', 'low', '{"sets": 3, "repsMin": 4, "repsMax": 6}', 0.7, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('strict-pull-up', 'pull-up', 'Strict Pull-up', 'سحب صارم', 4, 'intermediate', ARRAY['pull-up-bar'], 'dynamic', 'bent', 'strength', 'medium', '{"sets": 3, "repsMin": 4, "repsMax": 6}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('weighted-pull-up', 'pull-up', 'Weighted Pull-up', 'سحب مع وزن', 5, 'advanced', ARRAY['pull-up-bar', 'dip-belt', 'plates'], 'dynamic', 'bent', 'strength', 'medium', '{"sets": 3, "repsMin": 4, "repsMax": 6}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'WEIGHTED_DYNAMIC_FULL_SET'),
('muscle-up', 'muscle-up', 'Strict Bar Muscle-up', 'عضلة عكسية بالبار', 1, 'advanced', ARRAY['pull-up-bar'], 'dynamic', 'bent', 'skill', 'high', '{"sets": 4, "repsMin": 1, "repsMax": 3}', 0.8, '{"requiredExposures": 4, "requiredSuccessfulExposures": 3, "minQuality": 0.8, "requiresVideo": true, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.8, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('handstand-wall', 'handstand', 'Chest-to-wall Handstand', 'وقوف على اليدين بالجدار', 1, 'intermediate', ARRAY['wall'], 'static', 'straight', 'technique', 'medium', '{"sets": 5, "holdSecondsMin": 20, "holdSecondsMax": 45}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'TECHNIQUE_NO_VOLUME'),
('wall-hspu', 'handstand', 'Wall Handstand Push-up', 'دفع على اليدين بالجدار', 2, 'advanced', ARRAY['wall'], 'dynamic', 'bent', 'strength', 'high', '{"sets": 3, "repsMin": 3, "repsMax": 5}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('ring-push-up', 'ring-push-up', 'Ring Push-up', 'ضغط بالحلقات', 1, 'intermediate', ARRAY['rings'], 'dynamic', 'bent', 'skill', 'medium', '{"sets": 3, "repsMin": 6, "repsMax": 10}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('weighted-ring-push-up', 'ring-push-up', 'Weighted Ring Push-up', 'ضغط بالحلقات مع وزن', 2, 'advanced', ARRAY['rings', 'weight-vest', 'dip-belt', 'plates'], 'dynamic', 'bent', 'strength', 'medium', '{"sets": 3, "repsMin": 5, "repsMax": 8}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'WEIGHTED_DYNAMIC_FULL_SET'),
('box-pistol', 'pistol', 'Box Pistol', 'قرفصاء برجل واحدة على صندوق', 1, 'beginner', ARRAY['box'], 'dynamic', 'bent', 'skill', 'low', '{"sets": 3, "repsMin": 4, "repsMax": 6}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('full-pistol', 'pistol', 'Full Pistol', 'قرفصاء برجل واحدة كاملة', 2, 'intermediate', ARRAY['box'], 'dynamic', 'bent', 'strength', 'medium', '{"sets": 3, "repsMin": 3, "repsMax": 5}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'DYNAMIC_FULL_SET'),
('weighted-pistol', 'pistol', 'Weighted Pistol', 'قرفصاء برجل واحدة مع وزن', 3, 'advanced', ARRAY['box', 'dumbbells'], 'dynamic', 'bent', 'strength', 'medium', '{"sets": 3, "repsMin": 3, "repsMax": 5}', 0.75, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.75, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'WEIGHTED_DYNAMIC_FULL_SET'),
('tuck-front-lever', 'front-lever', 'Tuck Front Lever', 'رافعة أمامية مطوية', 1, 'intermediate', ARRAY['pull-up-bar'], 'static', 'straight', 'skill', 'high', '{"sets": 4, "holdSecondsMin": 6, "holdSecondsMax": 10}', 0.7, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'STATIC_EXPOSURE'),
('full-front-lever', 'front-lever', 'Full Front Lever', 'رافعة أمامية كاملة', 2, 'advanced', ARRAY['pull-up-bar'], 'static', 'straight', 'skill', 'high', '{"sets": 4, "holdSecondsMin": 6, "holdSecondsMax": 10}', 0.75, '{"requiredExposures": 4, "requiredSuccessfulExposures": 3, "minQuality": 0.75, "requiresVideo": true, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.75, "painBlocks": true}', 'STATIC_EXPOSURE'),
('tuck-back-lever', 'back-lever', 'Tuck Back Lever', 'رافعة خلفية مطوية', 1, 'intermediate', ARRAY['pull-up-bar', 'rings'], 'static', 'straight', 'skill', 'high', '{"sets": 4, "holdSecondsMin": 6, "holdSecondsMax": 10}', 0.7, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'STATIC_EXPOSURE'),
('tuck-planche', 'planche', 'Tuck Planche', 'بلانش مطوي', 1, 'intermediate', ARRAY['parallettes', 'floor'], 'static', 'straight', 'skill', 'high', '{"sets": 4, "holdSecondsMin": 6, "holdSecondsMax": 10}', 0.7, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'STATIC_EXPOSURE'),
('l-sit', 'l-sit', 'L-sit', 'جلوس L', 1, 'intermediate', ARRAY['parallettes', 'floor', 'rings'], 'static', 'straight', 'skill', 'low', '{"sets": 4, "holdSecondsMin": 10, "holdSecondsMax": 20}', 0.7, '{"requiredExposures": 3, "requiredSuccessfulExposures": 2, "minQuality": 0.7, "requiresVideo": false, "requiresCoach": false, "expertLocked": false}', '{"failedExposures": 3, "minQuality": 0.7, "painBlocks": true}', 'STATIC_EXPOSURE'),
('iron-cross', 'expert-rings', 'Iron Cross', 'صليب الحديد', 1, 'expert', ARRAY['rings'], 'static', 'straight', 'skill', 'expert', '{"sets": 4, "holdSecondsMin": 3, "holdSecondsMax": 6}', 0.85, '{"requiredExposures": 6, "requiredSuccessfulExposures": 5, "minQuality": 0.85, "requiresVideo": true, "requiresCoach": true, "expertLocked": true}', '{"failedExposures": 3, "minQuality": 0.85, "painBlocks": true}', 'EXPERT_STATIC_LOCKED')
ON CONFLICT (id) DO NOTHING;

-- Skill edges
INSERT INTO skill_edges (from_node_id, to_node_id, edge_type, priority) VALUES
('active-hang', 'scapular-pull-up', 'PREREQUISITE', 1),
('scapular-pull-up', 'assisted-pull-up', 'PREREQUISITE', 1),
('assisted-pull-up', 'strict-pull-up', 'PREREQUISITE', 1),
('strict-pull-up', 'weighted-pull-up', 'PREREQUISITE', 1),
('strict-pull-up', 'muscle-up', 'PREREQUISITE', 1),
('handstand-wall', 'wall-hspu', 'PREREQUISITE', 1),
('ring-push-up', 'weighted-ring-push-up', 'PREREQUISITE', 1),
('box-pistol', 'full-pistol', 'PREREQUISITE', 1),
('full-pistol', 'weighted-pistol', 'PREREQUISITE', 1),
('tuck-front-lever', 'full-front-lever', 'PREREQUISITE', 1),
('weighted-pull-up', 'muscle-up', 'ALTERNATIVE_PREREQUISITE', 2),
('weighted-pull-up', 'full-front-lever', 'TRANSFER', 3)
ON CONFLICT DO NOTHING;

-- Program version
INSERT INTO program_versions (id, name, version, mode) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Hybrid Gym-to-Calisthenics Curriculum — Version 2', 2, 'HYBRID_FOUNDATION')
ON CONFLICT (id) DO NOTHING;

-- Program days
INSERT INTO program_days (id, program_version_id, day_number, name, target_duration_minutes) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 1, 'Day 1 — Push Skill, Squat, Weighted Pull', 58),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 2, 'Day 2 — Muscle-up or Rings, Deadlift, Overhead Strength', 58),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 3, 'Day 3 — Lever or Pistol Skill, Front Squat, Incline Strength', 58)
ON CONFLICT (id) DO NOTHING;

-- Day 1 exercises
INSERT INTO program_exercises (id, program_day_id, exercise_id, skill_node_id, order_index, pair_id, pair_type, sets, reps_min, reps_max, hold_seconds_min, hold_seconds_max, rest_seconds, rir_target, order_class, role, tier) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', null, 'handstand-wall', 1, null, null, 5, null, null, 20, 45, 60, null, 'TECHNIQUE_FIRST', 'technique', 1),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'box-jump', null, 2, null, null, 3, 3, 3, null, null, 90, 2, 'POWER', 'power', 2),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'back-squat', null, 3, null, null, 3, 3, 5, null, null, 240, 2, 'GYM_STRENGTH', 'strength', 2),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'weighted-pull-up', null, 4, 'B', 'ALT', 3, 4, 6, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'bench-press', null, 5, 'B', 'ALT', 3, 4, 6, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440001', 'seated-leg-curl', null, 6, 'C', 'SS', 2, 8, 12, null, null, 75, 2, 'GYM_HYPERTROPHY', 'hypertrophy', 4),
('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440001', 'cable-lateral-raise', null, 7, 'C', 'SS', 2, 12, 20, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440001', 'ez-curl', null, 8, 'D', 'SS', 2, 6, 10, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440001', 'triceps-pressdown', null, 9, 'D', 'SS', 2, 8, 12, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440001', 'standing-calf-raise', null, 10, 'E', 'SS', 2, 8, 15, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-44665544001a', '550e8400-e29b-41d4-a716-446655440001', 'farmers-carry', null, 11, 'E', 'SS', 2, null, null, 20, 30, 75, 2, 'ACCESSORY', 'strength', 5)
ON CONFLICT (id) DO NOTHING;

-- Day 2 exercises
INSERT INTO program_exercises (id, program_day_id, exercise_id, skill_node_id, order_index, pair_id, pair_type, sets, reps_min, reps_max, hold_seconds_min, hold_seconds_max, rest_seconds, rir_target, order_class, role, tier) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', null, 'muscle-up', null, 1, null, 4, 1, 3, null, null, 90, null, 'STRENGTH_SKILL', 'skill', 1),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'medicine-ball-throw', null, 2, null, null, 3, 4, 4, null, null, 75, null, 'POWER', 'power', 2),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'trap-bar-deadlift', null, 3, null, null, 3, 3, 5, null, null, 240, 2, 'GYM_STRENGTH', 'strength', 2),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440002', 'overhead-press', null, 4, 'B', 'ALT', 3, 4, 6, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440002', 'chest-supported-row', null, 5, 'B', 'ALT', 3, 6, 8, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440002', 'hack-squat', null, 6, 'C', 'SS', 2, 6, 10, null, null, 90, 2, 'GYM_HYPERTROPHY', 'hypertrophy', 4),
('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440002', 'lying-leg-curl', null, 7, 'C', 'SS', 2, 8, 12, null, null, 90, 2, 'GYM_HYPERTROPHY', 'hypertrophy', 4),
('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440002', null, 'ring-push-up', 8, 'D', 'SS', 3, 6, 12, null, null, 90, 2, 'HYPERTROPHY_SKILL', 'skill', 4),
('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440002', 'lat-pulldown', null, 9, 'D', 'SS', 3, 8, 12, null, null, 90, 2, 'GYM_HYPERTROPHY', 'hypertrophy', 4),
('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440002', 'plate-pinch', null, 10, null, null, 2, null, null, 20, 30, 60, null, 'ACCESSORY', 'hypertrophy', 5)
ON CONFLICT (id) DO NOTHING;

-- Day 3 exercises
INSERT INTO program_exercises (id, program_day_id, exercise_id, skill_node_id, order_index, pair_id, pair_type, sets, reps_min, reps_max, hold_seconds_min, hold_seconds_max, rest_seconds, rir_target, order_class, role, tier) VALUES
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440003', null, 'tuck-front-lever', null, 1, null, 4, null, null, 6, 10, 60, null, 'STRENGTH_SKILL', 'skill', 1),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', null, 'l-sit', null, 2, null, 3, null, null, 10, 20, 45, null, 'STRENGTH_SKILL', 'skill', 1),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440003', 'trap-bar-jump', null, 3, null, null, 3, 3, 3, null, null, 105, null, 'POWER', 'power', 2),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440003', 'front-squat', null, 4, null, null, 3, 4, 6, null, null, 180, 2, 'GYM_STRENGTH', 'strength', 2),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440003', 'low-incline-press', null, 5, 'B', 'ALT', 3, 4, 6, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440003', 'lat-pulldown', null, 6, 'B', 'ALT', 3, 6, 10, null, null, 90, 2, 'GYM_STRENGTH', 'strength', 3),
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440003', 'romanian-deadlift', null, 7, 'C', 'ALT', 3, 6, 10, null, null, 90, 2, 'GYM_HYPERTROPHY', 'strength', 4),
('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440003', 'reverse-pec-deck', null, 8, 'C', 'ALT', 2, 12, 20, null, null, 90, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440003', 'leg-extension', null, 9, 'D', 'SS', 2, 10, 15, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-446655440039', '550e8400-e29b-41d4-a716-446655440003', 'cable-lateral-raise', null, 10, 'D', 'SS', 2, 12, 20, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-44665544003a', '550e8400-e29b-41d4-a716-446655440003', 'reverse-curl', null, 11, 'E', 'SS', 2, 8, 12, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-44665544003b', '550e8400-e29b-41d4-a716-446655440003', 'cable-triceps-pressdown', null, 12, 'E', 'SS', 2, 10, 15, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-44665544003c', '550e8400-e29b-41d4-a716-446655440003', 'single-leg-calf-raise', null, 13, 'F', 'SS', 3, 10, 15, null, null, 75, 2, 'ACCESSORY', 'hypertrophy', 5),
('550e8400-e29b-41d4-a716-44665544003d', '550e8400-e29b-41d4-a716-446655440003', 'towel-dead-hang', null, 14, 'F', 'SS', 2, null, null, 20, 30, 75, null, 'ACCESSORY', 'hypertrophy', 5)
ON CONFLICT (id) DO NOTHING;
