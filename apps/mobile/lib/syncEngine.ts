import type { ActiveWorkoutState, LoggedSet, SkillQualityDimensions } from '@gravitypath/domain';

export interface SyncSkillAttempt {
  id: string;
  userId: string;
  skillNodeId: string;
  workoutSessionId?: string;
  completedAt: string;
  repetitions?: number;
  holdSeconds?: number;
  validHoldSeconds?: number;
  externalLoadKg: number;
  assistance: string;
  leverageLevel: string;
  loadPlacement: string;
  apparatus?: string;
  grip?: string;
  modifiers?: Record<string, string>;
  qualityScore: number;
  qualityDimensions: SkillQualityDimensions;
  painLevel: number;
  fullRom: boolean;
  videoVerified: boolean;
  coachVerified: boolean;
  selfReported: boolean;
}

export interface SyncProgressionDecision {
  exerciseId: string;
  decisionType: string;
  newTarget?: { loadKg?: number; repsMin?: number; repsMax?: number; holdSeconds?: number };
  targetNodeId?: string;
  reason: string;
  decidedAt: string;
}

export interface SyncExercisePrescription {
  userId: string;
  exerciseId: string;
  programDayId: string;
  currentLoad: number;
  nextLoad: number;
  setCount: number;
  targetRepRange: { min: number; max: number };
  exactNextTargets: number[];
  targetRIR: number;
  restSeconds: number;
  bodyRegion: string;
  smallestPlateKg: number;
  progressionState: string;
  lastCompletedSessionId: string | null;
  lastDecisionId: string | null;
  activeDeload: boolean;
  activeSetAddition: boolean;
  overrideStatus: any;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
}

export interface SyncSkillPrescription {
  userId: string;
  skillNodeId: string;
  skillFamilyId: string;
  currentNode: string;
  nextCandidateNode: string | null;
  targetSets: number;
  targetRepsOrHoldSeconds: number;
  assistance: string;
  leverageLevel: string;
  externalLoad: number;
  loadPlacement: string;
  apparatus: string;
  grip: string;
  modifiers: Record<string, string>;
  qualityTarget: number;
  requiredSuccessfulExposures: number;
  progressionState: string;
  lastCompletedExposure: string | null;
  activeSafetyHold: boolean;
  overrideStatus?: any;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
}

export interface SyncSupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: any) => PromiseLike<{ data: any[] | null; error: any }>;
      in: (column: string, values: any[]) => PromiseLike<{ data: any[] | null; error: any }>;
    };
    upsert: (values: any, options?: { onConflict?: string }) => PromiseLike<{ data: any; error: any }>;
  };
}

export interface SyncResult {
  sessions: { success: string[]; failed: string[] };
  workoutSessions: { success: string[]; failed: string[] };
  sessionExercises: { success: string[]; failed: string[] };
  setLogs: { success: string[]; failed: string[] };
  skillAttempts: { success: string[]; failed: string[] };
  progressionDecisions: { success: string[]; failed: string[] };
  exercisePrescriptions: { success: string[]; failed: string[] };
  skillPrescriptions: { success: string[]; failed: string[] };
  errors: Array<{ table: string; clientId: string; error: any }>;
}

export interface SyncPendingRecordsInput {
  userId: string;
  supabaseClient: SyncSupabaseClient;
  pendingSets: LoggedSet[];
  completedWorkouts: ActiveWorkoutState[];
  skillAttempts: SyncSkillAttempt[];
  progressionDecisions: SyncProgressionDecision[];
  pendingExercisePrescriptions?: SyncExercisePrescription[];
  pendingSkillPrescriptions?: SyncSkillPrescription[];
}

function emptyResult(): SyncResult {
  return {
    sessions: { success: [], failed: [] },
    workoutSessions: { success: [], failed: [] },
    sessionExercises: { success: [], failed: [] },
    setLogs: { success: [], failed: [] },
    skillAttempts: { success: [], failed: [] },
    progressionDecisions: { success: [], failed: [] },
    exercisePrescriptions: { success: [], failed: [] },
    skillPrescriptions: { success: [], failed: [] },
    errors: []
  };
}

function groupBySessionId(sets: LoggedSet[]): Map<string, LoggedSet[]> {
  const map = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    if (!set.workoutSessionId) continue;
    const list = map.get(set.workoutSessionId) ?? [];
    list.push(set);
    map.set(set.workoutSessionId, list);
  }
  return map;
}

function findWorkoutExercise(workout: ActiveWorkoutState, exerciseLibraryId: string) {
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      if (ex.exerciseId === exerciseLibraryId) {
        return ex;
      }
    }
  }
  return undefined;
}

function getPlannedRestSeconds(workout: ActiveWorkoutState, exerciseLibraryId: string): number | null {
  return findWorkoutExercise(workout, exerciseLibraryId)?.restSeconds ?? null;
}

function buildSessionExerciseRows(
  workout: ActiveWorkoutState,
  sessionUuid: string,
  sessionClientId: string
): Array<Record<string, any>> {
  let orderIndex = 0;
  const rows: Array<Record<string, any>> = [];
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      rows.push({
        workout_session_id: sessionUuid,
        exercise_id: ex.exerciseId,
        skill_node_id: null,
        order_index: orderIndex++,
        pair_id: ex.pairId ?? null,
        pair_type: ex.pairType ?? null,
        target_sets: ex.targetSets ?? null,
        target_reps_min: ex.targetRepsMin ?? null,
        target_reps_max: ex.targetRepsMax ?? null,
        target_load_kg: ex.targetLoadKg ?? null,
        target_hold_seconds: ex.targetHoldSeconds ?? null,
        role: ex.role,
        status: workout.status === 'completed' ? 'completed' : 'in_progress',
        client_id: `${sessionClientId}-${ex.id}`
      });
    }
  }
  return rows;
}

function buildSkillAttemptRow(attempt: SyncSkillAttempt, sessionUuid: string): Record<string, any> {
  return {
    user_id: attempt.userId,
    workout_session_id: sessionUuid,
    skill_node_id: attempt.skillNodeId,
    repetitions: attempt.repetitions ?? null,
    hold_seconds: attempt.holdSeconds ?? null,
    valid_hold_seconds: attempt.validHoldSeconds ?? null,
    external_load_kg: attempt.externalLoadKg ?? 0,
    assistance: attempt.assistance,
    leverage_level: attempt.leverageLevel,
    load_placement: attempt.loadPlacement,
    apparatus: attempt.apparatus ?? null,
    quality_score: attempt.qualityScore,
    quality_dimensions: attempt.qualityDimensions,
    pain_level: attempt.painLevel ?? 0,
    full_rom: attempt.fullRom ?? true,
    result_status: 'completed',
    client_id: attempt.id,
    completed_at: attempt.completedAt,
    video_verified: attempt.videoVerified ?? false,
    coach_verified: attempt.coachVerified ?? false,
    self_reported: attempt.selfReported ?? true
  };
}

function buildProgressionDecisionRow(
  decision: SyncProgressionDecision,
  sessionClientId: string,
  sessionUuid: string,
  userId: string
): Record<string, any> {
  return {
    user_id: userId,
    workout_session_id: sessionUuid,
    exercise_id: decision.exerciseId,
    skill_node_id: decision.targetNodeId ?? null,
    decision_type: decision.decisionType,
    target_node_id: decision.targetNodeId ?? null,
    new_target: decision.newTarget ?? null,
    reason: decision.reason,
    decided_at: decision.decidedAt,
    client_id: `${sessionClientId}-${decision.exerciseId}`
  };
}

function buildExercisePrescriptionRow(prescription: SyncExercisePrescription): Record<string, any> {
  return {
    user_id: prescription.userId,
    exercise_id: prescription.exerciseId,
    program_day_id: prescription.programDayId,
    current_load: prescription.currentLoad,
    next_load: prescription.nextLoad,
    set_count: prescription.setCount,
    target_reps_min: prescription.targetRepRange.min,
    target_reps_max: prescription.targetRepRange.max,
    exact_next_targets: prescription.exactNextTargets,
    target_rir: prescription.targetRIR,
    rest_seconds: prescription.restSeconds,
    body_region: prescription.bodyRegion,
    smallest_plate_kg: prescription.smallestPlateKg,
    progression_state: prescription.progressionState,
    last_completed_session_id: prescription.lastCompletedSessionId,
    last_decision_id: prescription.lastDecisionId,
    active_deload: prescription.activeDeload,
    active_set_addition: prescription.activeSetAddition,
    override_status: prescription.overrideStatus,
    created_at: prescription.createdAt,
    updated_at: prescription.updatedAt,
    client_id: prescription.clientId
  };
}

function buildSkillPrescriptionRow(prescription: SyncSkillPrescription): Record<string, any> {
  return {
    user_id: prescription.userId,
    skill_node_id: prescription.skillNodeId,
    skill_family_id: prescription.skillFamilyId,
    current_node: prescription.currentNode,
    next_candidate_node: prescription.nextCandidateNode,
    target_sets: prescription.targetSets,
    target_reps_or_hold_seconds: prescription.targetRepsOrHoldSeconds,
    assistance: prescription.assistance,
    leverage_level: prescription.leverageLevel,
    external_load: prescription.externalLoad,
    load_placement: prescription.loadPlacement,
    apparatus: prescription.apparatus,
    grip: prescription.grip,
    modifiers: prescription.modifiers,
    quality_target: prescription.qualityTarget,
    required_successful_exposures: prescription.requiredSuccessfulExposures,
    progression_state: prescription.progressionState,
    last_completed_exposure: prescription.lastCompletedExposure,
    active_safety_hold: prescription.activeSafetyHold,
    override_status: prescription.overrideStatus ?? null,
    created_at: prescription.createdAt,
    updated_at: prescription.updatedAt,
    client_id: prescription.clientId
  };
}

export async function syncPendingRecords(input: SyncPendingRecordsInput): Promise<SyncResult> {
  const {
    userId,
    supabaseClient,
    pendingSets,
    completedWorkouts,
    skillAttempts,
    progressionDecisions,
    pendingExercisePrescriptions = [],
    pendingSkillPrescriptions = []
  } = input;
  const result = emptyResult();

  const setsBySession = groupBySessionId(pendingSets);
  const workoutById = new Map(completedWorkouts.map((w) => [w.id, w]));

  for (const [sessionClientId, sets] of setsBySession) {
    const workout = workoutById.get(sessionClientId);
    if (!workout) {
      result.errors.push({
        table: 'workout_sessions',
        clientId: sessionClientId,
        error: new Error('Completed workout not found for session')
      });
      result.workoutSessions.failed.push(sessionClientId);
      result.sessions.failed.push(sessionClientId);
      continue;
    }

    // Resolve program_day_id from the mobile curriculum client_id (day1, day2, day3).
    const { data: dayRows, error: dayError } = await supabaseClient
      .from('program_days')
      .select('id')
      .eq('client_id', workout.programDayId);

    if (dayError || !dayRows || dayRows.length === 0) {
      result.errors.push({
        table: 'program_days',
        clientId: workout.programDayId,
        error: dayError ?? new Error('Program day not found')
      });
      result.workoutSessions.failed.push(sessionClientId);
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    const programDayId = dayRows[0].id;

    // Upsert parent session.
    const { error: sessionError } = await supabaseClient.from('workout_sessions').upsert(
      {
        user_id: userId,
        program_day_id: programDayId,
        started_at: workout.startedAt,
        completed_at: workout.completedAt ?? null,
        status: workout.status,
        elapsed_seconds: workout.elapsedSeconds ?? 0,
        client_id: workout.id
      },
      { onConflict: 'client_id' }
    );

    if (sessionError) {
      result.errors.push({ table: 'workout_sessions', clientId: sessionClientId, error: sessionError });
      result.workoutSessions.failed.push(sessionClientId);
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    result.workoutSessions.success.push(sessionClientId);

    // Read back the generated session UUID for child rows.
    const { data: sessionRows, error: sessionReadError } = await supabaseClient
      .from('workout_sessions')
      .select('id')
      .eq('client_id', sessionClientId);

    if (sessionReadError || !sessionRows || sessionRows.length === 0) {
      result.errors.push({
        table: 'workout_sessions',
        clientId: sessionClientId,
        error: sessionReadError ?? new Error('Could not read back session id')
      });
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    const sessionUuid = sessionRows[0].id;

    // Upsert session exercises.
    const exerciseRows = buildSessionExerciseRows(workout, sessionUuid, sessionClientId);
    const { error: exerciseError } = await supabaseClient
      .from('session_exercises')
      .upsert(exerciseRows, { onConflict: 'client_id' });

    if (exerciseError) {
      result.errors.push({ table: 'session_exercises', clientId: sessionClientId, error: exerciseError });
      result.sessionExercises.failed.push(...exerciseRows.map((r) => r.client_id));
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    result.sessionExercises.success.push(...exerciseRows.map((r) => r.client_id));

    // Read back exercise UUIDs so set_logs can reference them.
    const exerciseClientIds = exerciseRows.map((r) => r.client_id);
    const { data: exerciseReadRows, error: exerciseReadError } = await supabaseClient
      .from('session_exercises')
      .select('id,client_id')
      .in('client_id', exerciseClientIds);

    if (exerciseReadError || !exerciseReadRows) {
      result.errors.push({
        table: 'session_exercises',
        clientId: sessionClientId,
        error: exerciseReadError ?? new Error('Could not read back exercise ids')
      });
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    const exerciseUuidByClientId = new Map(exerciseReadRows.map((r) => [r.client_id, r.id]));

    // Upsert set logs.
    const setRows = sets.map((set) => {
      const workoutExercise = findWorkoutExercise(workout, set.exerciseId);
      const exerciseClientId = workoutExercise ? `${sessionClientId}-${workoutExercise.id}` : '';
      return {
        session_exercise_id: exerciseUuidByClientId.get(exerciseClientId) ?? null,
        set_number: set.setNumber,
        load_kg: set.loadKg,
        repetitions: set.reps,
        rir: set.rir,
        rom: set.rom,
        form: set.form,
        pain_level: set.painLevel ?? 0,
        rest_seconds_planned: getPlannedRestSeconds(workout, set.exerciseId),
        rest_seconds_actual: set.restSeconds,
        completed_at: set.completedAt ?? null,
        client_id: set.id,
        notes: set.status !== 'completed' ? set.status : null
      };
    });

    const missingExercise = setRows.some((r) => r.session_exercise_id === null);
    if (missingExercise) {
      result.errors.push({
        table: 'set_logs',
        clientId: sessionClientId,
        error: new Error('Session exercise UUID missing for one or more sets')
      });
      result.setLogs.failed.push(...sets.map((s) => s.id));
      result.sessions.failed.push(sessionClientId);
      continue;
    }

    const { error: setError } = await supabaseClient.from('set_logs').upsert(setRows, { onConflict: 'client_id' });

    if (setError) {
      result.errors.push({ table: 'set_logs', clientId: sessionClientId, error: setError });
      result.setLogs.failed.push(...sets.map((s) => s.id));
      result.sessions.failed.push(sessionClientId);
      continue;
    }
    result.setLogs.success.push(...sets.map((s) => s.id));

    // Upsert skill attempts linked to this session.
    const sessionAttempts = skillAttempts.filter((a) => a.workoutSessionId === sessionClientId);
    if (sessionAttempts.length > 0) {
      const attemptRows = sessionAttempts.map((a) => buildSkillAttemptRow(a, sessionUuid));
      const { error: attemptError } = await supabaseClient
        .from('skill_attempts')
        .upsert(attemptRows, { onConflict: 'client_id' });

      if (attemptError) {
        result.errors.push({ table: 'skill_attempts', clientId: sessionClientId, error: attemptError });
        result.skillAttempts.failed.push(...sessionAttempts.map((a) => a.id));
        result.sessions.failed.push(sessionClientId);
        continue;
      }
      result.skillAttempts.success.push(...sessionAttempts.map((a) => a.id));
    }

    // Upsert progression decisions for this session.
    if (progressionDecisions.length > 0) {
      const decisionRows = progressionDecisions.map((d) =>
        buildProgressionDecisionRow(d, sessionClientId, sessionUuid, userId)
      );
      const { error: decisionError } = await supabaseClient
        .from('progression_decisions')
        .upsert(decisionRows, { onConflict: 'client_id' });

      if (decisionError) {
        result.errors.push({ table: 'progression_decisions', clientId: sessionClientId, error: decisionError });
        result.progressionDecisions.failed.push(...decisionRows.map((r) => r.client_id));
        result.sessions.failed.push(sessionClientId);
        continue;
      }
      result.progressionDecisions.success.push(...decisionRows.map((r) => r.client_id));
    }

    result.sessions.success.push(sessionClientId);
  }

  // Upsert pending exercise prescriptions independently of session sync.
  if (pendingExercisePrescriptions.length > 0) {
    const rows = pendingExercisePrescriptions.map(buildExercisePrescriptionRow);
    const { error } = await supabaseClient
      .from('exercise_prescriptions')
      .upsert(rows, { onConflict: 'client_id' });
    const clientIds = rows.map((r) => r.client_id);
    if (error) {
      result.errors.push({ table: 'exercise_prescriptions', clientId: clientIds.join(', '), error });
      result.exercisePrescriptions.failed.push(...clientIds);
    } else {
      result.exercisePrescriptions.success.push(...clientIds);
    }
  }

  // Upsert pending skill prescriptions independently of session sync.
  if (pendingSkillPrescriptions.length > 0) {
    const rows = pendingSkillPrescriptions.map(buildSkillPrescriptionRow);
    const { error } = await supabaseClient.from('skill_prescriptions').upsert(rows, { onConflict: 'client_id' });
    const clientIds = rows.map((r) => r.client_id);
    if (error) {
      result.errors.push({ table: 'skill_prescriptions', clientId: clientIds.join(', '), error });
      result.skillPrescriptions.failed.push(...clientIds);
    } else {
      result.skillPrescriptions.success.push(...clientIds);
    }
  }

  return result;
}
