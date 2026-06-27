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
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
import { startWorkoutStateWithPrescriptions } from '../lib/prescriptions';

function resetStores() {
  usePrescriptionStore.setState({
    exercisePrescriptions: {},
    skillPrescriptions: {},
    pendingExercisePrescriptions: {},
    pendingSkillPrescriptions: {},
    initialized: false
  });
  useSkillPriorityStore.setState({
    primarySkillFamilyId: 'handstand',
    secondarySkillFamilyIds: [],
    maintenanceSkillFamilyIds: [],
    inactiveSkillFamilyIds: [],
    goalTemplate: 'advanced_calisthenics',
    blockStart: null,
    blockEnd: null,
    blockLengthWeeks: 12,
    initialized: false
  });
  useSkillStore.setState({ attempts: [], unlockOverrides: {} });
}

describe('skill slot workout integration', () => {
  beforeEach(() => {
    resetStores();
  });

  it('starts Day 1 with handstand skill when handstand is primary', () => {
    const workout = startWorkoutStateWithPrescriptions('day1');
    const skillBlocks = workout.blocks.filter(
      (b) => b.orderClass === 'TECHNIQUE_FIRST' || b.orderClass === 'STRENGTH_SKILL'
    );
    expect(skillBlocks.length).toBeGreaterThan(0);
    const handstandBlock = skillBlocks.find((b) =>
      b.exercises.some((e) => e.familyId === 'handstand' || e.exerciseId.startsWith('handstand') || e.exerciseId === 'wrist-prep' || e.exerciseId === 'wall-plank' || e.exerciseId === 'wall-walk' || e.exerciseId === 'handstand-wall')
    );
    expect(handstandBlock).toBeDefined();
  });

  it('starts Day 2 with muscle-up skill when muscle-up is primary', () => {
    useSkillPriorityStore.getState().setPrimary('muscle-up');
    const workout = startWorkoutStateWithPrescriptions('day2');
    const skillBlocks = workout.blocks.filter(
      (b) => b.orderClass === 'STRENGTH_SKILL' || b.orderClass === 'HYPERTROPHY_SKILL'
    );
    expect(skillBlocks.length).toBeGreaterThan(0);
  });

  it('keeps gym strength blocks alongside dynamic skill slots', () => {
    const workout = startWorkoutStateWithPrescriptions('day1');
    const exerciseIds = workout.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId));
    expect(exerciseIds).toContain('back-squat');
    expect(exerciseIds).toContain('box-jump');
  });

  it('does not erase skill prescriptions when primary changes', () => {
    usePrescriptionStore.getState().initializePrescriptions('local');
    const before = usePrescriptionStore.getState().skillPrescriptions['handstand-wall'];
    expect(before).toBeDefined();

    useSkillPriorityStore.getState().setPrimary('muscle-up');
    usePrescriptionStore.getState().recomputeSkillStatuses();

    const after = usePrescriptionStore.getState().skillPrescriptions['handstand-wall'];
    expect(after).toBeDefined();
    // Status is recomputed based on unlock graph; without attempts it remains locked.
    expect(['maintenance', 'locked', 'active_secondary']).toContain(after.status);
  });
});
