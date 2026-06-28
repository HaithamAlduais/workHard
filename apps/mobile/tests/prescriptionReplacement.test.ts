// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import type { ActiveWorkoutState, WorkoutExercise } from '@gravitypath/domain';

function resetStore() {
  usePrescriptionStore.setState({
    exercisePrescriptions: {},
    skillPrescriptions: {},
    pendingExercisePrescriptions: {},
    pendingSkillPrescriptions: {},
    replacementHistory: [],
    activeReplacements: {},
    initialized: false
  });
}

function makeRecord(exerciseId: string, percentage = 100) {
  return {
    id: `r-${exerciseId}`,
    exerciseId,
    calisthenicsNodeId: 'weighted-pull-up',
    percentage,
    reason: 'Skill ready',
    approvedAt: new Date().toISOString(),
    status: 'active' as const
  };
}

function makeWorkout(exercise: Partial<WorkoutExercise>): ActiveWorkoutState {
  const base: WorkoutExercise = {
    id: 'lp1',
    exerciseId: 'lat-pulldown',
    name: 'Lat Pulldown',
    nameAr: 'سحب علوي',
    orderClass: 'GYM_HYPERTROPHY',
    pairId: 'D',
    pairType: 'SS',
    role: 'hypertrophy',
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetLoadKg: 0,
    restSeconds: 90,
    ...exercise
  };
  return {
    id: 'ws-test',
    programDayId: 'day2',
    dayName: 'Day 2',
    dayNameAr: 'اليوم 2',
    startedAt: new Date().toISOString(),
    status: 'active',
    blocks: [{ id: 'b1', orderClass: 'GYM_HYPERTROPHY', exercises: [base], completed: false, startedAt: new Date().toISOString() }],
    currentBlockIndex: 0,
    elapsedSeconds: 0
  };
}

describe('prescriptionStore replacement actions', () => {
  beforeEach(() => {
    resetStore();
  });

  it('approves a replacement and makes it active', () => {
    const record = makeRecord('lat-pulldown');
    usePrescriptionStore.getState().approveReplacement(record);
    const state = usePrescriptionStore.getState();
    expect(state.activeReplacements['lat-pulldown']).toEqual(record);
    expect(state.replacementHistory).toContainEqual(record);
  });

  it('rejects an active replacement and records rejection', () => {
    const record = makeRecord('lat-pulldown');
    usePrescriptionStore.getState().approveReplacement(record);
    usePrescriptionStore.getState().rejectReplacement('lat-pulldown');
    const state = usePrescriptionStore.getState();
    expect(state.activeReplacements['lat-pulldown']).toBeUndefined();
    expect(state.replacementHistory.some((r) => r.id === 'r-lat-pulldown' && r.status === 'rejected')).toBe(true);
    expect(state.isOnCooldown('lat-pulldown')).toBe(true);
  });

  it('reversing an approved replacement removes it from active', () => {
    const record = makeRecord('lat-pulldown');
    usePrescriptionStore.getState().approveReplacement(record);
    usePrescriptionStore.getState().rejectReplacement('lat-pulldown');
    const state = usePrescriptionStore.getState();
    expect(state.getActiveReplacement('lat-pulldown')).toBeUndefined();
    expect(state.replacementHistory.filter((r) => r.exerciseId === 'lat-pulldown').length).toBeGreaterThan(0);
  });

  it('defers an active replacement without cooldown', () => {
    const record = makeRecord('lat-pulldown');
    usePrescriptionStore.getState().approveReplacement(record);
    usePrescriptionStore.getState().deferReplacement('lat-pulldown');
    const state = usePrescriptionStore.getState();
    expect(state.activeReplacements['lat-pulldown']).toBeUndefined();
    expect(state.replacementHistory.some((r) => r.status === 'deferred')).toBe(true);
    expect(state.isOnCooldown('lat-pulldown')).toBe(false);
  });

  it('supersedes a previous active record when approving a new one', () => {
    const first = { ...makeRecord('lat-pulldown', 50), id: 'r1' };
    const second = { ...makeRecord('lat-pulldown', 75), id: 'r2' };
    usePrescriptionStore.getState().approveReplacement(first);
    usePrescriptionStore.getState().approveReplacement(second);
    const state = usePrescriptionStore.getState();
    expect(state.activeReplacements['lat-pulldown'].id).toBe('r2');
    expect(state.replacementHistory.find((r) => r.id === 'r1')?.status).toBe('superseded');
    expect(state.replacementHistory.find((r) => r.id === 'r2')?.status).toBe('active');
  });

  it('splits sets correctly for a partial replacement', () => {
    usePrescriptionStore.setState({
      exercisePrescriptions: {
        'day2|lat-pulldown': {
          userId: 'u',
          programDayId: 'day2',
          exerciseId: 'lat-pulldown',
          setCount: 3,
          currentLoad: 50,
          targetRepRange: { min: 8, max: 12 },
          targetRIR: 2,
          restSeconds: 90,
          orderClass: 'GYM_HYPERTROPHY',
          role: 'hypertrophy',
          bodyRegion: 'upper-back',
          clientId: 'u|day2|lat-pulldown'
        }
      }
    });
    const workout = makeWorkout({ replacementPercentage: 50 });
    const applied = usePrescriptionStore.getState().applyPrescriptionsToWorkout(workout);
    const ex = applied.blocks[0].exercises[0];
    expect(ex.targetSets).toBe(2);
  });

  it('keeps full set count when replacement percentage is 0', () => {
    usePrescriptionStore.setState({
      exercisePrescriptions: {
        'day2|lat-pulldown': {
          userId: 'u',
          programDayId: 'day2',
          exerciseId: 'lat-pulldown',
          setCount: 3,
          currentLoad: 50,
          targetRepRange: { min: 8, max: 12 },
          targetRIR: 2,
          restSeconds: 90,
          orderClass: 'GYM_HYPERTROPHY',
          role: 'hypertrophy',
          bodyRegion: 'upper-back',
          clientId: 'u|day2|lat-pulldown'
        }
      }
    });
    const workout = makeWorkout({});
    const applied = usePrescriptionStore.getState().applyPrescriptionsToWorkout(workout);
    const ex = applied.blocks[0].exercises[0];
    expect(ex.targetSets).toBe(3);
  });
});
