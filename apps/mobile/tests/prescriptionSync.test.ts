// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { syncPendingRecords } from '../lib/syncEngine';

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

function makeExercisePrescription(overrides: Partial<any> = {}) {
  return {
    userId: 'user-1',
    exerciseId: 'bench-press',
    programDayId: 'day1',
    currentLoad: 80,
    nextLoad: 82.5,
    setCount: 3,
    targetRepRange: { min: 4, max: 6 },
    exactNextTargets: [82.5, 85],
    targetRIR: 2,
    restSeconds: 90,
    bodyRegion: 'upper',
    smallestPlateKg: 1.25,
    progressionState: 'add_load',
    lastCompletedSessionId: 'ws-1',
    lastDecisionId: 'ws-1|bench-press|ADD_LOAD',
    activeDeload: false,
    activeSetAddition: false,
    overrideStatus: null,
    createdAt: new Date('2024-06-26T08:00:00.000Z'),
    updatedAt: new Date('2024-06-26T09:00:00.000Z'),
    clientId: 'user-1|day1|bench-press',
    ...overrides
  };
}

function makeSkillPrescription(overrides: Partial<any> = {}) {
  return {
    userId: 'user-1',
    skillNodeId: 'strict-pull-up',
    skillFamilyId: 'pull-up',
    currentNode: 'scapular-pull',
    nextCandidateNode: 'negative-pull-up',
    targetSets: 3,
    targetRepsOrHoldSeconds: 10,
    assistance: 'none',
    leverageLevel: 'full',
    externalLoad: 0,
    loadPlacement: 'bodyweight',
    apparatus: 'pull-up-bar',
    grip: 'pronated',
    modifiers: { tempo: '2010' },
    qualityTarget: 0.7,
    requiredSuccessfulExposures: 3,
    progressionState: 'maintain',
    lastCompletedExposure: 'ws-1',
    activeSafetyHold: false,
    overrideStatus: null,
    createdAt: new Date('2024-06-26T08:00:00.000Z'),
    updatedAt: new Date('2024-06-26T09:00:00.000Z'),
    clientId: 'user-1|strict-pull-up',
    ...overrides
  };
}

describe('prescription sync', () => {
  const userId = 'user-1';

  it('upserts a pending exercise prescription and skill prescription', async () => {
    const client = createMockClient();
    const exerciseRx = makeExercisePrescription();
    const skillRx = makeSkillPrescription();

    const result = await syncPendingRecords({
      userId,
      supabaseClient: client,
      pendingSets: [],
      completedWorkouts: [],
      skillAttempts: [],
      progressionDecisions: [],
      pendingExercisePrescriptions: [exerciseRx],
      pendingSkillPrescriptions: [skillRx]
    });

    expect(result.exercisePrescriptions.success).toContain(exerciseRx.clientId);
    expect(result.exercisePrescriptions.failed).toHaveLength(0);
    expect(result.skillPrescriptions.success).toContain(skillRx.clientId);
    expect(result.skillPrescriptions.failed).toHaveLength(0);

    const exerciseRows = client._tables['exercise_prescriptions'];
    expect(exerciseRows).toHaveLength(1);
    expect(exerciseRows[0].client_id).toBe(exerciseRx.clientId);
    expect(exerciseRows[0].user_id).toBe(userId);
    expect(exerciseRows[0].exercise_id).toBe(exerciseRx.exerciseId);
    expect(exerciseRows[0].program_day_id).toBe(exerciseRx.programDayId);
    expect(exerciseRows[0].current_load).toBe(80);
    expect(exerciseRows[0].target_reps_min).toBe(4);
    expect(exerciseRows[0].target_reps_max).toBe(6);
    expect(exerciseRows[0].exact_next_targets).toEqual([82.5, 85]);

    const skillRows = client._tables['skill_prescriptions'];
    expect(skillRows).toHaveLength(1);
    expect(skillRows[0].client_id).toBe(skillRx.clientId);
    expect(skillRows[0].user_id).toBe(userId);
    expect(skillRows[0].skill_node_id).toBe(skillRx.skillNodeId);
    expect(skillRows[0].skill_family_id).toBe(skillRx.skillFamilyId);
    expect(skillRows[0].target_sets).toBe(3);
    expect(skillRows[0].quality_target).toBe(0.7);
  });

  it('records failed client_ids when prescription upserts fail', async () => {
    const client = createMockClient({ failTable: 'exercise_prescriptions' });
    const exerciseRx = makeExercisePrescription();
    const skillRx = makeSkillPrescription();

    const result = await syncPendingRecords({
      userId,
      supabaseClient: client,
      pendingSets: [],
      completedWorkouts: [],
      skillAttempts: [],
      progressionDecisions: [],
      pendingExercisePrescriptions: [exerciseRx],
      pendingSkillPrescriptions: [skillRx]
    });

    expect(result.exercisePrescriptions.failed).toContain(exerciseRx.clientId);
    expect(result.skillPrescriptions.success).toContain(skillRx.clientId);
    expect(client._tables['exercise_prescriptions'] ?? []).toHaveLength(0);
    expect(client._tables['skill_prescriptions']).toHaveLength(1);
  });
});
