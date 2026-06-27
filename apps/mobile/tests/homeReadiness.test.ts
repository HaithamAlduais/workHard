// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { useEquipmentStore } from '../stores/equipmentStore';
import { useSkillStore } from '../stores/skillStore';
import { buildHomeReadiness } from '../lib/readiness';
import type { ActiveWorkoutState, LoggedSet, SkillAttempt } from '@gravitypath/domain';

function resetStores() {
  useEquipmentStore.setState({ owned: {} });
  useSkillStore.setState({ attempts: [], unlockOverrides: {} });
}

function makeLatsWorkout(sets: number): { workout: ActiveWorkoutState; loggedSets: LoggedSet[] } {
  const workoutId = 'ws-lats';
  const blockId = 'b1';
  const specId = 'lat-pulldown-1';
  const workout: ActiveWorkoutState = {
    id: workoutId,
    programDayId: 'day-readiness',
    status: 'completed',
    completedAt: new Date().toISOString(),
    currentBlockIndex: 0,
    elapsedSeconds: 0,
    blocks: [
      {
        id: blockId,
        type: 'STRAIGHT',
        orderIndex: 0,
        orderClass: 'GYM_HYPERTROPHY',
        currentExerciseIndex: 0,
        completed: true,
        exercises: [
          {
            id: specId,
            exerciseId: 'lat-pulldown',
            name: 'Lat Pulldown',
            nameAr: 'سحب علوي',
            orderClass: 'GYM_HYPERTROPHY',
            role: 'hypertrophy',
            targetSets: sets,
            targetRepsMin: 8,
            targetRepsMax: 12,
            targetLoadKg: 40,
            restSeconds: 90
          }
        ]
      }
    ]
  };

  const loggedSets: LoggedSet[] = Array.from({ length: sets }, (_, i) => ({
    id: `set-${i}`,
    blockId,
    exerciseId: specId,
    workoutSessionId: workoutId,
    setNumber: i + 1,
    loadKg: 40,
    reps: 10,
    rir: 2,
    holdSeconds: 0,
    rom: 'full',
    form: 'good',
    painLevel: 0,
    restSeconds: 90,
    completedAt: new Date().toISOString(),
    pendingSync: true,
    status: 'completed'
  }));

  return { workout, loggedSets };
}

function makePullUpAttempts(): SkillAttempt[] {
  const base: Omit<SkillAttempt, 'id'> = {
    userId: 'local',
    skillNodeId: 'strict-pull-up',
    workoutSessionId: 'ws-1',
    completedAt: new Date(),
    repetitions: 5,
    holdSeconds: undefined,
    validHoldSeconds: undefined,
    externalLoadKg: 0,
    assistance: 'none',
    leverageLevel: 'full',
    loadPlacement: 'none',
    qualityScore: 0.8,
    qualityDimensions: {
      bodyLine: 0.8, scapularPosition: 0.8, elbowPosition: 0.8, symmetry: 0.8,
      stability: 0.8, momentum: 0.8, rom: 0.8, control: 0.8
    },
    painLevel: 0,
    fullRom: true,
    videoVerified: false,
    coachVerified: false,
    selfReported: false
  };
  return [
    { ...base, id: 'a1' },
    { ...base, id: 'a2' }
  ];
}

function makePainfulSkillWorkout(): { workout: ActiveWorkoutState; loggedSets: LoggedSet[] } {
  const workoutId = 'ws-pain';
  const blockId = 'b-pain';
  const specId = 'strict-pull-up-pain';
  const workout: ActiveWorkoutState = {
    id: workoutId,
    programDayId: 'day-pain',
    status: 'completed',
    completedAt: new Date().toISOString(),
    currentBlockIndex: 0,
    elapsedSeconds: 0,
    blocks: [
      {
        id: blockId,
        type: 'STRAIGHT',
        orderIndex: 0,
        orderClass: 'STRENGTH_SKILL',
        currentExerciseIndex: 0,
        completed: true,
        exercises: [
          {
            id: specId,
            exerciseId: 'strict-pull-up',
            name: 'Strict Pull-up',
            nameAr: 'سحب صارم',
            orderClass: 'STRENGTH_SKILL',
            role: 'skill',
            targetSets: 3,
            targetRepsMin: 4,
            targetRepsMax: 6,
            targetLoadKg: 0,
            restSeconds: 120
          }
        ]
      }
    ]
  };
  const loggedSets: LoggedSet[] = [
    {
      id: 'pain-set',
      blockId,
      exerciseId: specId,
      workoutSessionId: workoutId,
      setNumber: 1,
      loadKg: 0,
      reps: 5,
      rir: 0,
      holdSeconds: 0,
      rom: 'full',
      form: 'good',
      painLevel: 2,
      restSeconds: 120,
      completedAt: new Date().toISOString(),
      pendingSync: true,
      status: 'completed'
    }
  ];
  return { workout, loggedSets };
}

describe('buildHomeReadiness', () => {
  beforeEach(() => {
    resetStores();
  });

  it('reports VERTICAL_PULL not ready when pull-up bar is missing', () => {
    const { workout, loggedSets } = makeLatsWorkout(8);
    useSkillStore.getState().setUnlockOverride('strict-pull-up', 'unlocked');

    const { readiness } = buildHomeReadiness([workout], loggedSets, makePullUpAttempts(), 50);
    const verticalPull = readiness.get('VERTICAL_PULL')!;
    expect(verticalPull.equipmentReady).toBe(false);
    expect(verticalPull.blockers.some((b) => b.includes('Missing equipment'))).toBe(true);
  });

  it('marks VERTICAL_PULL ready when equipment, skill, volume and time are satisfied', () => {
    useEquipmentStore.getState().setOwned('pull-up-bar', true);
    useSkillStore.getState().setUnlockOverride('strict-pull-up', 'unlocked');

    const { workout, loggedSets } = makeLatsWorkout(8);
    const result = buildHomeReadiness([workout], loggedSets, makePullUpAttempts(), 50);
    const verticalPull = result.readiness.get('VERTICAL_PULL')!;
    expect(verticalPull.equipmentReady).toBe(true);
    expect(verticalPull.performanceReady).toBe(true);
    expect(verticalPull.volumeReady).toBe(true);
    expect(verticalPull.timeReady).toBe(true);
    expect(verticalPull.painFree).toBe(true);
    expect(result.percent).toBeGreaterThan(0);
  });

  it('flags pain when a relevant skill set reports pain', () => {
    useEquipmentStore.getState().setOwned('pull-up-bar', true);
    useSkillStore.getState().setUnlockOverride('strict-pull-up', 'unlocked');

    const { workout: latsWorkout, loggedSets: latsSets } = makeLatsWorkout(8);
    const { workout: painWorkout, loggedSets: painSets } = makePainfulSkillWorkout();
    const result = buildHomeReadiness(
      [latsWorkout, painWorkout],
      [...latsSets, ...painSets],
      makePullUpAttempts(),
      50
    );
    const verticalPull = result.readiness.get('VERTICAL_PULL')!;
    expect(verticalPull.painFree).toBe(false);
    expect(verticalPull.blockers.some((b) => b.includes('Pain'))).toBe(true);
  });
});
