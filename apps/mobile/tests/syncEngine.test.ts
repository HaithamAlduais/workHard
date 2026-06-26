// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { syncPendingRecords } from '../lib/syncEngine';
import type { ActiveWorkoutState, LoggedSet } from '@gravitypath/domain';

function createMockClient(options: { failTable?: string; failClientId?: string } = {}) {
  const tables: Record<string, any[]> = {};

  function getRows(table: string) {
    if (!tables[table]) tables[table] = [];
    return tables[table];
  }

  function shouldFail(table: string, row: any) {
    if (options.failTable !== table) return false;
    if (options.failClientId === undefined) return true;
    return row.client_id === options.failClientId;
  }

  return {
    _tables: tables,
    from(table: string) {
      return {
        select(columns: string) {
          return {
            async eq(column: string, value: any) {
              // program_days are seeded in the real DB; emulate that here.
              if (table === 'program_days' && column === 'client_id') {
                const seeded = [
                  { id: 'pd-day1', client_id: 'day1' },
                  { id: 'pd-day2', client_id: 'day2' },
                  { id: 'pd-day3', client_id: 'day3' }
                ];
                return { data: seeded.filter((r) => r[column] === value), error: null };
              }
              const rows = getRows(table).filter((r) => r[column] === value);
              return { data: rows, error: null };
            },
            async in(column: string, values: any[]) {
              const rows = getRows(table).filter((r) => values.includes(r[column]));
              return { data: rows, error: null };
            }
          };
        },
        async upsert(values: any | any[], opts?: any) {
          const rows = Array.isArray(values) ? values : [values];
          for (const row of rows) {
            if (shouldFail(table, row)) {
              return { data: null, error: { message: `mock ${table} upsert failure` } };
            }
          }
          for (const row of rows) {
            const existing = getRows(table);
            const idx = existing.findIndex((r) => r.client_id === row.client_id);
            const record = {
              ...row,
              id: row.id ?? `uuid-${table}-${existing.length}`
            };
            if (idx >= 0) {
              existing[idx] = { ...existing[idx], ...record };
            } else {
              existing.push(record);
            }
          }
          return { data: null, error: null };
        }
      };
    }
  };
}

function makeWorkout(overrides: Partial<ActiveWorkoutState> = {}): ActiveWorkoutState {
  return {
    id: 'ws-1',
    programDayId: 'day1',
    dayName: 'Test Day',
    dayNameAr: 'يوم اختبار',
    startedAt: '2024-06-26T08:00:00.000Z',
    completedAt: '2024-06-26T09:00:00.000Z',
    status: 'completed',
    elapsedSeconds: 3600,
    currentBlockIndex: 0,
    blocks: [
      {
        id: 'block-1',
        type: 'STRAIGHT',
        orderIndex: 0,
        orderClass: 'GYM_STRENGTH',
        currentExerciseIndex: 0,
        completed: true,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'bench-press',
            name: 'Bench Press',
            nameAr: 'ضغط صدر',
            orderClass: 'GYM_STRENGTH',
            role: 'strength',
            targetSets: 3,
            targetRepsMin: 4,
            targetRepsMax: 6,
            targetLoadKg: 80,
            restSeconds: 90
          }
        ]
      }
    ],
    ...overrides
  };
}

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    id: 'set-1',
    blockId: 'block-1',
    exerciseId: 'bench-press',
    workoutSessionId: 'ws-1',
    setNumber: 1,
    loadKg: 80,
    reps: 5,
    rir: 2,
    holdSeconds: 0,
    rom: 'full',
    form: 'good',
    painLevel: 0,
    restSeconds: 90,
    completedAt: '2024-06-26T08:15:00.000Z',
    pendingSync: true,
    status: 'completed',
    ...overrides
  };
}

function makeSkillAttempt() {
  return {
    id: 'skill-1',
    userId: 'user-1',
    skillNodeId: 'strict-pull-up',
    workoutSessionId: 'ws-1',
    completedAt: '2024-06-26T08:30:00.000Z',
    repetitions: 5,
    holdSeconds: 0,
    validHoldSeconds: 0,
    externalLoadKg: 0,
    assistance: 'none',
    leverageLevel: 'full',
    loadPlacement: 'bodyweight',
    apparatus: 'pull-up-bar',
    grip: 'pronated',
    modifiers: { tempo: '2010' },
    qualityScore: 0.85,
    qualityDimensions: {
      bodyLine: 0.9,
      scapularPosition: 0.8,
      elbowPosition: 0.85,
      symmetry: 0.9,
      stability: 0.85,
      momentum: 0.8,
      rom: 1,
      control: 0.85
    },
    painLevel: 0,
    fullRom: true,
    videoVerified: false,
    coachVerified: false,
    selfReported: true
  };
}

function makeDecision() {
  return {
    exerciseId: 'bench-press',
    decisionType: 'ADD_LOAD',
    newTarget: { loadKg: 82.5, repsMin: 4, repsMax: 6 },
    targetNodeId: undefined,
    reason: 'good form',
    decidedAt: '2024-06-26T09:05:00.000Z'
  };
}

describe('syncPendingRecords', () => {
  const userId = 'user-1';

  it('builds session, exercises, set logs, skill attempts and decisions with correct ids', async () => {
    const client = createMockClient();
    const workout = makeWorkout();
    const set = makeSet();
    const attempt = makeSkillAttempt();
    const decision = makeDecision();

    const result = await syncPendingRecords({
      userId,
      supabaseClient: client,
      pendingSets: [set],
      completedWorkouts: [workout],
      skillAttempts: [attempt],
      progressionDecisions: [decision]
    });

    expect(result.sessions.success).toContain('ws-1');
    expect(result.workoutSessions.success).toContain('ws-1');
    expect(result.sessionExercises.success).toContain('ws-1-ex-1');
    expect(result.setLogs.success).toContain('set-1');
    expect(result.skillAttempts.success).toContain('skill-1');
    expect(result.progressionDecisions.success).toContain('ws-1-bench-press');

    const sessions = client._tables['workout_sessions'];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].client_id).toBe('ws-1');
    expect(sessions[0].user_id).toBe(userId);
    expect(sessions[0].program_day_id).toBe('pd-day1');

    const exercises = client._tables['session_exercises'];
    expect(exercises).toHaveLength(1);
    expect(exercises[0].client_id).toBe('ws-1-ex-1');
    expect(exercises[0].exercise_id).toBe('bench-press');
    expect(exercises[0].target_sets).toBe(3);
    expect(exercises[0].target_load_kg).toBe(80);

    const sets = client._tables['set_logs'];
    expect(sets).toHaveLength(1);
    expect(sets[0].client_id).toBe('set-1');
    expect(sets[0].session_exercise_id).toBe(exercises[0].id);
    expect(sets[0].load_kg).toBe(80);
    expect(sets[0].repetitions).toBe(5);
    expect(sets[0].rir).toBe(2);
    expect(sets[0].rest_seconds_planned).toBe(90);
    expect(sets[0].rest_seconds_actual).toBe(90);

    const attempts = client._tables['skill_attempts'];
    expect(attempts).toHaveLength(1);
    expect(attempts[0].client_id).toBe('skill-1');
    expect(attempts[0].workout_session_id).toBe(sessions[0].id);
    expect(attempts[0].skill_node_id).toBe('strict-pull-up');

    const decisions = client._tables['progression_decisions'];
    expect(decisions).toHaveLength(1);
    expect(decisions[0].client_id).toBe('ws-1-bench-press');
    expect(decisions[0].exercise_id).toBe('bench-press');
    expect(decisions[0].workout_session_id).toBe(sessions[0].id);
  });

  it('is idempotent: same client_id does not create duplicates', async () => {
    const client = createMockClient();
    const workout = makeWorkout();
    const set = makeSet();
    const attempt = makeSkillAttempt();
    const decision = makeDecision();

    const input = {
      userId,
      supabaseClient: client,
      pendingSets: [set],
      completedWorkouts: [workout],
      skillAttempts: [attempt],
      progressionDecisions: [decision]
    };

    await syncPendingRecords(input);
    await syncPendingRecords(input);

    expect(client._tables['workout_sessions']).toHaveLength(1);
    expect(client._tables['session_exercises']).toHaveLength(1);
    expect(client._tables['set_logs']).toHaveLength(1);
    expect(client._tables['skill_attempts']).toHaveLength(1);
    expect(client._tables['progression_decisions']).toHaveLength(1);
  });

  it('does not mark a set as synced when its session_exercise parent fails', async () => {
    const client = createMockClient({ failTable: 'session_exercises', failClientId: 'ws-1-ex-1' });
    const workout = makeWorkout();
    const set = makeSet();

    const result = await syncPendingRecords({
      userId,
      supabaseClient: client,
      pendingSets: [set],
      completedWorkouts: [workout],
      skillAttempts: [],
      progressionDecisions: []
    });

    expect(result.sessions.success).not.toContain('ws-1');
    expect(result.sessions.failed).toContain('ws-1');
    expect(result.workoutSessions.success).toContain('ws-1');
    expect(result.sessionExercises.success).not.toContain('ws-1-ex-1');
    expect(result.setLogs.success).not.toContain('set-1');
    expect(client._tables['set_logs'] ?? []).toHaveLength(0);
  });

  it('does not mark a set as synced when its session parent fails', async () => {
    const client = createMockClient({ failTable: 'workout_sessions', failClientId: 'ws-1' });
    const workout = makeWorkout();
    const set = makeSet();

    const result = await syncPendingRecords({
      userId,
      supabaseClient: client,
      pendingSets: [set],
      completedWorkouts: [workout],
      skillAttempts: [],
      progressionDecisions: []
    });

    expect(result.sessions.success).not.toContain('ws-1');
    expect(result.sessions.failed).toContain('ws-1');
    expect(result.workoutSessions.success).not.toContain('ws-1');
    expect(result.setLogs.success).not.toContain('set-1');
    expect(client._tables['session_exercises'] ?? []).toHaveLength(0);
    expect(client._tables['set_logs'] ?? []).toHaveLength(0);
  });
});
