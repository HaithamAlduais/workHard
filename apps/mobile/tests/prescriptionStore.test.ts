// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { usePrescriptionStore, type ExercisePrescriptionWithMeta } from '../stores/prescriptionStore';
import type { ProgressionDecision } from '../stores/workoutStore';
import type { CalibrationState } from '../stores/calibrationStore';

function resetStore() {
  usePrescriptionStore.setState({
    exercisePrescriptions: {},
    skillPrescriptions: {},
    pendingExercisePrescriptions: {},
    pendingSkillPrescriptions: {},
    initialized: false
  });
}

function makeCalibration(overrides: Partial<CalibrationState> = {}): CalibrationState {
  return {
    profile: { name: '', unitSystem: 'metric', primarySkillFamilyId: 'handstand' },
    exerciseLoads: {},
    skillStartingNodes: {},
    completed: false,
    setProfile: () => {},
    setExerciseLoad: () => {},
    setSkillStartingNode: () => {},
    completeCalibration: () => {},
    getCalibrationLoad: (exerciseId: string) => {
      const defaults: Record<string, number> = {
        'back-squat': 60,
        'bench-press': 50
      };
      return overrides.exerciseLoads?.[exerciseId] ?? defaults[exerciseId];
    },
    ...overrides
  } as CalibrationState;
}

describe('prescriptionStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('initializes exercise and skill prescriptions from curriculum', () => {
    usePrescriptionStore.getState().initializePrescriptions('user-1', makeCalibration());
    const state = usePrescriptionStore.getState();

    expect(state.initialized).toBe(true);
    expect(state.exercisePrescriptions['day1|back-squat']).toBeDefined();
    expect(state.exercisePrescriptions['day1|back-squat'].currentLoad).toBe(60);
    expect(state.exercisePrescriptions['day1|bench-press'].currentLoad).toBe(50);
    expect(state.skillPrescriptions['handstand-wall']).toBeDefined();
    expect(state.skillPrescriptions['handstand-wall'].targetSets).toBeGreaterThan(0);
  });

  it('applies prescriptions to a workout', () => {
    const store = usePrescriptionStore.getState();
    store.initializePrescriptions('user-1', makeCalibration({ exerciseLoads: { 'back-squat': 70 } }));

    const workout: any = {
      programDayId: 'day1',
      blocks: [
        {
          id: 'b1',
          type: 'STRAIGHT',
          orderIndex: 0,
          orderClass: 'GYM_STRENGTH',
          currentExerciseIndex: 0,
          completed: false,
          exercises: [
            {
              id: 'sq1',
              exerciseId: 'back-squat',
              name: 'Back Squat',
              nameAr: 'قرفصاء خلفية',
              orderClass: 'GYM_STRENGTH',
              role: 'strength',
              targetSets: 3,
              targetRepsMin: 3,
              targetRepsMax: 5,
              targetLoadKg: 80,
              restSeconds: 240
            }
          ]
        }
      ]
    };

    const updated = store.applyPrescriptionsToWorkout(workout);
    const ex = updated.blocks[0].exercises[0];
    expect(ex.targetLoadKg).toBe(70);
    expect(ex.targetSets).toBe(3);
    expect(ex.targetRepsMin).toBe(3);
    expect(ex.targetRepsMax).toBe(5);
  });

  it('updates exercise prescription on ADD_LOAD decision', () => {
    const store = usePrescriptionStore.getState();
    store.initializePrescriptions('user-1', makeCalibration());

    const decisions: ProgressionDecision[] = [
      {
        exerciseId: 'back-squat',
        decisionType: 'ADD_LOAD',
        newTarget: { loadKg: 82.5 },
        reason: 'All sets at top of range. Add load.',
        decidedAt: new Date().toISOString()
      }
    ];

    store.applyProgressionDecisions(decisions, 'day1', 'ws-1');
    const p = usePrescriptionStore.getState().exercisePrescriptions['day1|back-squat'] as ExercisePrescriptionWithMeta;
    expect(p.currentLoad).toBe(82.5);
    expect(p.nextLoad).toBe(82.5);
    expect(p.progressionState).toBe('add_load');
    expect(p.exactNextTargets).toEqual([3, 3, 3]);
    expect(p.lastCompletedSessionId).toBe('ws-1');
    expect(usePrescriptionStore.getState().pendingExercisePrescriptions['day1|back-squat']).toBe(true);
  });

  it('updates exercise prescription on ADD_REPS decision', () => {
    const store = usePrescriptionStore.getState();
    store.initializePrescriptions('user-1', makeCalibration());

    const decisions: ProgressionDecision[] = [
      {
        exerciseId: 'bench-press',
        decisionType: 'ADD_REPS',
        reason: 'Add one rep.',
        decidedAt: new Date().toISOString()
      }
    ];

    store.applyProgressionDecisions(decisions, 'day1', 'ws-2');
    const p = usePrescriptionStore.getState().exercisePrescriptions['day1|bench-press'] as ExercisePrescriptionWithMeta;
    expect(p.progressionState).toBe('add_reps');
    expect(p.exactNextTargets).toEqual([5, 5, 6]);
  });

  it('updates skill prescription on ADD_HOLD_TIME decision', () => {
    const store = usePrescriptionStore.getState();
    store.initializePrescriptions('user-1', makeCalibration());
    const state = usePrescriptionStore.getState();
    const before = state.skillPrescriptions['handstand-wall'].targetRepsOrHoldSeconds;

    const decisions: ProgressionDecision[] = [
      {
        exerciseId: 'handstand-wall',
        decisionType: 'ADD_HOLD_TIME',
        reason: 'Hold time target not yet consistent.',
        decidedAt: new Date().toISOString()
      }
    ];

    store.applyProgressionDecisions(decisions, 'day1', 'ws-3');
    const p = usePrescriptionStore.getState().skillPrescriptions['handstand-wall'];
    expect(p.targetRepsOrHoldSeconds).toBeGreaterThan(before);
    expect(p.progressionState).toBe('add_hold_time');
    expect(p.lastCompletedExposure).toBe('ws-3');
    expect(usePrescriptionStore.getState().pendingSkillPrescriptions['handstand-wall']).toBe(true);
  });
});
