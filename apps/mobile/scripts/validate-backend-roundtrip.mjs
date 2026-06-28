import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function assertOk(result, label) {
  if (result.error) {
    console.error(`${label} failed:`, result.error);
    throw new Error(`${label} failed`);
  }
  console.log(`✓ ${label}`);
  return result.data;
}

async function cleanup(userId, timestamp) {
  console.log('\nCleaning up test records...');
  const admin = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : supabase;

  // Delete child rows first, then parents.
  const tables = [
    ['progression_decisions', 'user_id'],
    ['set_logs', 'session_exercise_id'], // fallback: we delete by session below
    ['session_exercises', 'workout_session_id'],
    ['skill_attempts', 'user_id'],
    ['workout_sessions', 'user_id'],
    ['exercise_prescriptions', 'user_id'],
    ['skill_prescriptions', 'user_id'],
    ['equipment_inventory', 'user_id'],
    ['graduation_contracts', 'user_id'],
    ['profiles', 'id']
  ];

  for (const [table, column] of tables) {
    const result = await admin.from(table).delete().eq(column, userId);
    if (result.error) {
      console.warn(`  cleanup skipped for ${table}: ${result.error.message}`);
    }
  }

  if (SUPABASE_SERVICE_ROLE_KEY && admin.auth.admin) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`  auth user deletion skipped: ${error.message}`);
    else console.log('  deleted auth user');
  }
}

async function main() {
  const timestamp = Date.now();
  const email = `roundtrip+${timestamp}@example.com`;
  const password = 'RoundTrip123!';
  let userId = null;

  console.log('Starting backend round-trip validation...');
  console.log('URL:', SUPABASE_URL);

  // 1. Sign up
  const signUp = assertOk(
    await supabase.auth.signUp({ email, password }),
    'Sign up'
  );
  const user = signUp.user;
  if (!user) throw new Error('No user returned after signup');
  userId = user.id;

  // 2. Sign in and keep the session in memory
  const signIn = assertOk(
    await supabase.auth.signInWithPassword({ email, password }),
    'Sign in'
  );
  if (signIn.session) {
    await supabase.auth.setSession({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token
    });
  }

  try {
    // 3. Read own profile (created by trigger)
    assertOk(
      await supabase.from('profiles').select('*').eq('id', userId).single(),
      'Read profile'
    );

    // 4. Update profile
    assertOk(
      await supabase.from('profiles').update({ name: 'Roundtrip User' }).eq('id', userId),
      'Update profile'
    );

    // 5. Manage equipment inventory
    assertOk(
      await supabase.from('equipment_inventory').upsert({
        user_id: userId,
        equipment_id: 'pull-up-bar',
        owned: true,
        quantity: 1
      }),
      'Upsert equipment'
    );

    // 6. Fetch a program day to link the workout
    const programDay = assertOk(
      await supabase.from('program_days').select('id, program_version_id').limit(1).single(),
      'Fetch program day'
    );

    // 7. Create workout session
    const session = assertOk(
      await supabase.from('workout_sessions').insert({
        user_id: userId,
        program_version_id: programDay.program_version_id,
        program_day_id: programDay.id,
        status: 'completed',
        elapsed_seconds: 3600,
        client_id: `mobile-${timestamp}`
      }).select().single(),
      'Insert workout session'
    );

    // 8. Create session exercise
    const exercise = assertOk(
      await supabase.from('session_exercises').insert({
        workout_session_id: session.id,
        exercise_id: 'bench-press',
        order_index: 0,
        target_sets: 3,
        target_reps_min: 4,
        target_reps_max: 6,
        target_load_kg: 80,
        role: 'strength',
        client_id: `exercise-${timestamp}`
      }).select().single(),
      'Insert session exercise'
    );

    // 9. Log a set
    assertOk(
      await supabase.from('set_logs').insert({
        session_exercise_id: exercise.id,
        set_number: 1,
        load_kg: 82.5,
        repetitions: 5,
        rir: 2,
        rom: 'full',
        form: 'good',
        pain_level: 0,
        completed_at: new Date().toISOString(),
        client_id: `set-${timestamp}`
      }),
      'Insert set log'
    );

    // 10. Progression decision
    assertOk(
      await supabase.from('progression_decisions').insert({
        user_id: userId,
        workout_session_id: session.id,
        exercise_id: 'bench-press',
        decision_type: 'ADD_LOAD',
        new_target: { loadKg: 85 },
        reason: 'All sets hit top of range',
        decided_at: new Date().toISOString(),
        client_id: `decision-${timestamp}`
      }),
      'Insert progression decision'
    );

    // 11. Skill attempt
    assertOk(
      await supabase.from('skill_attempts').insert({
        user_id: userId,
        workout_session_id: session.id,
        skill_node_id: 'strict-pull-up',
        repetitions: 5,
        quality_score: 0.85,
        pain_level: 0,
        full_rom: true,
        completed_at: new Date().toISOString(),
        client_id: `attempt-${timestamp}`,
        self_reported: true
      }),
      'Insert skill attempt'
    );

    // 12. Exercise prescription
    assertOk(
      await supabase.from('exercise_prescriptions').upsert({
        user_id: userId,
        exercise_id: 'bench-press',
        program_day_id: 'day2',
        current_load: 82.5,
        next_load: 85,
        set_count: 3,
        target_reps_min: 4,
        target_reps_max: 6,
        target_rir: 2,
        rest_seconds: 90,
        body_region: 'upper',
        smallest_plate_kg: 1.25,
        progression_state: 'add_load',
        client_id: `ex-${timestamp}`
      }),
      'Upsert exercise prescription'
    );

    // 13. Skill prescription
    assertOk(
      await supabase.from('skill_prescriptions').upsert({
        user_id: userId,
        skill_node_id: 'strict-pull-up',
        skill_family_id: 'pull-up',
        current_node: 'strict-pull-up',
        next_candidate_node: 'weighted-pull-up',
        target_sets: 3,
        target_reps_or_hold_seconds: 5,
        assistance: 'none',
        leverage_level: 'full',
        external_load: 0,
        load_placement: 'none',
        apparatus: 'pull-up-bar',
        grip: 'overhand',
        modifiers: {},
        quality_target: 0.75,
        required_successful_exposures: 2,
        progression_state: 'add_rep',
        active_safety_hold: false,
        client_id: `sk-${timestamp}`
      }),
      'Upsert skill prescription'
    );

    // 14. Graduation contract
    assertOk(
      await supabase.from('graduation_contracts').insert({
        user_id: userId,
        template_type: 'PRACTICAL_HOME_INDEPENDENCE',
        status: 'active'
      }),
      'Insert graduation contract'
    );

    // 15. Read back all user-owned rows
    const readBack = [
      ['set_logs', `set-${timestamp}`],
      ['progression_decisions', `decision-${timestamp}`],
      ['skill_attempts', `attempt-${timestamp}`],
      ['exercise_prescriptions', `ex-${timestamp}`],
      ['skill_prescriptions', `sk-${timestamp}`]
    ];

    for (const [table, clientId] of readBack) {
      const rows = assertOk(
        await supabase.from(table).select('id').eq('client_id', clientId),
        `Read ${table} back`
      );
      if (rows.length !== 1) throw new Error(`${table} round trip mismatch`);
    }

    const sessionsBack = assertOk(
      await supabase.from('workout_sessions').select('id, client_id').eq('user_id', userId),
      'Read workout sessions back'
    );
    if (sessionsBack.length !== 1) throw new Error('Workout session round trip mismatch');

    console.log('\n✅ Backend round-trip validation passed');
    console.log('User ID:', userId);
  } finally {
    if (userId) await cleanup(userId, timestamp);
  }
}

main().catch((err) => {
  console.error('\n❌ Backend round-trip validation failed:', err.message);
  process.exit(1);
});
