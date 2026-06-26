import { describe, it, expect } from 'vitest';
import {
  createExercisePrescription,
  applyStrengthDecision,
  applyHypertrophyDecision,
  nextPerSetRepTargets,
  createSkillPrescription,
  applySkillDecision,
  applyOverride
} from '../src/prescriptions/engine.js';
import type { ExercisePrescription, OverrideRecord } from '../src/prescriptions/types.js';
import type { SkillNode } from '../src/types.js';

function baseExercisePrescription(overrides?: Partial<ExercisePrescription>): ExercisePrescription {
  return {
    user_id: 'user-1',
    exercise_id: 'bench-press',
    program_day_id: 'day-a',
    currentLoad: 80,
    nextLoad: 80,
    setCount: 3,
    targetRepRange: { min: 3, max: 5 },
    exactNextTargets: [3, 4, 5],
    targetRIR: 1,
    restSeconds: 120,
    bodyRegion: 'upper',
    smallestPlateKg: 1.25,
    progressionState: 'maintain',
    lastCompletedSessionId: null,
    lastDecisionId: null,
    activeDeload: false,
    activeSetAddition: false,
    overrideStatus: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client_id: 'client-1',
    ...overrides
  };
}

const baseSkillNode: SkillNode = {
  id: 'strict-pull-up',
  familyId: 'pull-up',
  name: 'Strict Pull-up',
  nameAr: 'سحب صارم',
  stage: 5,
  difficulty: 'intermediate',
  apparatus: ['pull-up-bar'],
  staticOrDynamic: 'dynamic',
  bentOrStraightArm: 'bent',
  role: 'strength',
  riskLevel: 'medium',
  targetDose: { sets: 3, repsMin: 4, repsMax: 6, weeklyExposures: 2 },
  targetQuality: 0.75,
  unlockRule: { requiredExposures: 3, requiredSuccessfulExposures: 2, minQuality: 0.75, requiresVideo: false, requiresCoach: false, expertLocked: false },
  regressRule: { failedExposures: 3, minQuality: 0.75, painBlocks: true },
  volumeRule: 'DYNAMIC_FULL_SET',
  prerequisites: ['strict-chin-up'],
  progressions: ['weighted-pull-up'],
  regressions: ['strict-chin-up'],
  replacementCandidates: ['pulldown']
};

const staticSkillNode: SkillNode = {
  ...baseSkillNode,
  id: 'tuck-front-lever',
  familyId: 'front-lever',
  name: 'Tuck Front Lever',
  nameAr: 'رافعة أمامية مطوية',
  stage: 1,
  staticOrDynamic: 'static',
  targetDose: { sets: 4, holdSecondsMin: 6, holdSecondsMax: 10, weeklyExposures: 2 },
  progressions: ['advanced-tuck-front-lever'],
  regressions: ['active-hang']
};

describe('nextPerSetRepTargets', () => {
  it('distributes reps evenly across the range deterministically', () => {
    expect(nextPerSetRepTargets([3, 4, 5], { min: 3, max: 5 }, 'ADD_LOAD')).toEqual([3, 3, 3]);
  });

  it('adds one rep to the lowest set first', () => {
    expect(nextPerSetRepTargets([6, 5, 5], { min: 3, max: 6 }, 'ADD_REPS')).toEqual([6, 6, 5]);
  });

  it('fills the lowest value before moving up', () => {
    expect(nextPerSetRepTargets([5, 5, 4], { min: 3, max: 6 }, 'ADD_REPS')).toEqual([5, 5, 5]);
  });
});

describe('Exercise prescription creation', () => {
  it('initializes current load from calibration when provided', () => {
    const prescription = createExercisePrescription({
      userId: 'u1',
      programDayId: 'd1',
      exerciseId: 'squat',
      exerciseSpec: { targetLoadKg: 60, setCount: 3, targetRepRange: { min: 4, max: 6 }, targetRIR: 2, restSeconds: 180 },
      bodyRegion: 'lower',
      smallestPlateKg: 2.5,
      calibrationLoad: 100
    });
    expect(prescription.currentLoad).toBe(100);
    expect(prescription.nextLoad).toBe(100);
  });

  it('falls back to exercise spec load when calibration is omitted', () => {
    const prescription = createExercisePrescription({
      userId: 'u1',
      programDayId: 'd1',
      exerciseId: 'curl',
      exerciseSpec: { targetLoadKg: 15, setCount: 3, targetRepRange: { min: 8, max: 12 }, targetRIR: 1, restSeconds: 60 },
      bodyRegion: 'upper',
      smallestPlateKg: 1.25
    });
    expect(prescription.currentLoad).toBe(15);
  });
});

describe('applyStrengthDecision', () => {
  it('ADD_REPS updates exact target by adding one total rep to the lowest set', () => {
    const prescription = baseExercisePrescription({ targetRepRange: { min: 5, max: 6 }, exactNextTargets: [6, 5, 5] });
    const updated = applyStrengthDecision(prescription, { type: 'ADD_REPS', addedReps: 1, reason: 'test' });
    expect(updated.exactNextTargets).toEqual([6, 6, 5]);
    expect(updated.progressionState).toBe('add_reps');
  });

  it('ADD_LOAD resets reps to bottom range and increases load', () => {
    const prescription = baseExercisePrescription({ currentLoad: 80, nextLoad: 80, exactNextTargets: [5, 5, 5] });
    const updated = applyStrengthDecision(prescription, { type: 'ADD_LOAD', newLoadKg: 81.25, incrementKg: 1.25, reason: 'test' });
    expect(updated.currentLoad).toBe(81.25);
    expect(updated.nextLoad).toBe(81.25);
    expect(updated.exactNextTargets).toEqual([3, 3, 3]);
    expect(updated.progressionState).toBe('add_load');
  });

  it('REDUCE_LOAD applies safely and lowers targets conservatively', () => {
    const prescription = baseExercisePrescription({ currentLoad: 100, nextLoad: 100, exactNextTargets: [5, 5, 5] });
    const updated = applyStrengthDecision(prescription, { type: 'REDUCE_LOAD', newLoadKg: 95, reductionPercent: 0.05, reason: 'test' });
    expect(updated.currentLoad).toBe(95);
    expect(updated.nextLoad).toBe(95);
    expect(updated.exactNextTargets.every((t) => t >= 3 && t <= 5)).toBe(true);
    expect(updated.progressionState).toBe('reduce_load');
  });

  it('MAINTAIN preserves targets and load', () => {
    const prescription = baseExercisePrescription();
    const updated = applyStrengthDecision(prescription, { type: 'MAINTAIN_LOAD', reason: 'test' });
    expect(updated.exactNextTargets).toEqual([3, 4, 5]);
    expect(updated.currentLoad).toBe(80);
    expect(updated.nextLoad).toBe(80);
    expect(updated.progressionState).toBe('maintain');
  });

  it('zero-RIR logged does not by itself corrupt prescription', () => {
    const prescription = baseExercisePrescription({ exactNextTargets: [4, 4, 4] });
    const updated = applyStrengthDecision(prescription, { type: 'MAINTAIN_LOAD', reason: 'zero rir observed' });
    expect(updated.exactNextTargets).toEqual([4, 4, 4]);
    expect(updated.currentLoad).toBe(80);
    expect(updated.nextLoad).toBe(80);
  });
});

describe('applyHypertrophyDecision', () => {
  it('ADD_LOAD resets reps to bottom range and increases load', () => {
    const prescription = baseExercisePrescription({
      targetRepRange: { min: 8, max: 12 },
      exactNextTargets: [12, 12, 12],
      currentLoad: 15,
      nextLoad: 15,
      smallestPlateKg: 1.25
    });
    const updated = applyHypertrophyDecision(prescription, { type: 'ADD_LOAD', newLoadKg: 16.25, incrementKg: 1.25, reason: 'test' });
    expect(updated.currentLoad).toBe(16.25);
    expect(updated.exactNextTargets).toEqual([8, 8, 8]);
  });
});

describe('applyOverride', () => {
  it('preserves the original recommendation in the override record', () => {
    const prescription = baseExercisePrescription();
    const original = { type: 'ADD_LOAD', newLoadKg: 81.25, incrementKg: 1.25, reason: 'original' } as const;
    const userOverride = { type: 'MAINTAIN_LOAD', reason: 'equipment unavailable' } as const;
    const record: OverrideRecord = {
      originalRecommendation: original,
      userOverride,
      reason: 'equipment_unavailable',
      timestamp: new Date(),
      affectsProgressionEligibility: true
    };
    const updated = applyOverride(prescription, record);
    expect(updated.overrideStatus).not.toBeNull();
    expect(updated.overrideStatus?.originalRecommendation).toEqual(original);
    expect(updated.overrideStatus?.userOverride).toEqual(userOverride);
    expect(updated.overrideStatus?.reason).toBe('equipment_unavailable');
  });
});

describe('Skill prescription creation', () => {
  it('initializes from a dynamic node with rep targets', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode });
    expect(prescription.skill_node_id).toBe('strict-pull-up');
    expect(prescription.targetSets).toBe(3);
    expect(prescription.targetRepsOrHoldSeconds).toBe(4);
    expect(prescription.currentNode).toBe('strict-pull-up');
    expect(prescription.nextCandidateNode).toBe('weighted-pull-up');
  });

  it('initializes from a static node with hold targets', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: staticSkillNode });
    expect(prescription.targetRepsOrHoldSeconds).toBe(6);
    expect(prescription.currentNode).toBe('tuck-front-lever');
  });

  it('respects starting node override', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode, startingNodeId: 'assisted-pull-up' });
    expect(prescription.currentNode).toBe('assisted-pull-up');
  });
});

describe('applySkillDecision', () => {
  it('UNLOCK_NEXT_NODE updates current and next candidate nodes', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode });
    const updated = applySkillDecision(prescription, { type: 'UNLOCK_NEXT_NODE', targetNodeId: 'weighted-pull-up', reason: 'test' });
    expect(updated.progressionState).toBe('unlock_next');
    expect(updated.nextCandidateNode).toBe('weighted-pull-up');
  });

  it('REDUCE_ASSISTANCE steps assistance down without changing leverage', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode });
    const withAssistance = { ...prescription, assistance: 'heavy' };
    const updated = applySkillDecision(withAssistance, { type: 'REDUCE_ASSISTANCE', reason: 'test' });
    expect(updated.assistance).toBe('medium');
    expect(updated.leverageLevel).toBe('full');
    expect(updated.progressionState).toBe('reduce_assistance');
  });

  it('ADD_HOLD_TIME increases hold target correctly', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: staticSkillNode });
    const updated = applySkillDecision(prescription, { type: 'ADD_HOLD_TIME', reason: 'test' });
    expect(updated.targetRepsOrHoldSeconds).toBe(7);
    expect(updated.progressionState).toBe('add_hold_time');
  });

  it('HOLD_FOR_SAFETY sets active safety hold', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode });
    const updated = applySkillDecision(prescription, { type: 'HOLD_FOR_SAFETY', reason: 'test' });
    expect(updated.activeSafetyHold).toBe(true);
    expect(updated.progressionState).toBe('hold_safety');
  });

  it('REGRESS_NODE moves current node to target and keeps previous as candidate', () => {
    const prescription = createSkillPrescription({ userId: 'u1', node: baseSkillNode });
    const updated = applySkillDecision(prescription, { type: 'REGRESS_NODE', targetNodeId: 'strict-chin-up', reason: 'test' });
    expect(updated.currentNode).toBe('strict-chin-up');
    expect(updated.nextCandidateNode).toBe('strict-pull-up');
    expect(updated.progressionState).toBe('regress');
  });
});
