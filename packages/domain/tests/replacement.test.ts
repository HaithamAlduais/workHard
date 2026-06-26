import { describe, it, expect } from 'vitest';
import { decideReplacement } from '../src/index.js';
import type { Exercise, SkillNode, SkillAttempt } from '../src/types.js';

const pulldown: Exercise = {
  id: 'pulldown',
  movementPatternId: 'vertical-pull',
  name: 'Lat Pulldown',
  nameAr: 'سحب علوي',
  role: 'STRENGTH_AND_HYPERTROPHY',
  orderClass: 'GYM_STRENGTH',
  equipmentIds: ['cable'],
  primaryMuscleIds: ['lats'],
  secondaryMuscleIds: ['biceps'],
  requiresGym: true,
  canBeReplaced: true,
  defaultWarmupSeconds: 120,
  defaultWorkingSetSeconds: 50,
  transitionSeconds: 45
};

const weightedPullUpNode: SkillNode = {
  id: 'weighted-pull-up',
  familyId: 'pull-up',
  name: 'Weighted Pull-up',
  nameAr: 'سحب مع وزن',
  stage: 8,
  difficulty: 'advanced',
  apparatus: ['bar', 'dip-belt', 'plates'],
  staticOrDynamic: 'dynamic',
  bentOrStraightArm: 'bent',
  role: 'strength',
  riskLevel: 'medium',
  targetDose: { sets: 3, repsMin: 4, repsMax: 6, weeklyExposures: 2 },
  targetQuality: 0.75,
  unlockRule: { requiredExposures: 3, requiredSuccessfulExposures: 2, minQuality: 0.75, requiresVideo: false, requiresCoach: false, expertLocked: false },
  regressRule: { failedExposures: 3, minQuality: 0.75, painBlocks: true },
  volumeRule: 'WEIGHTED_DYNAMIC_FULL_SET',
  prerequisites: ['strict-pull-up'],
  progressions: ['heavy-weighted-pull-up'],
  regressions: ['strict-pull-up'],
  replacementCandidates: ['pulldown']
};

function makeAttempt(reps: number, quality = 0.8): SkillAttempt {
  return {
    id: 'a',
    userId: 'u',
    skillNodeId: 'weighted-pull-up',
    completedAt: new Date(),
    repetitions: reps,
    holdSeconds: undefined,
    validHoldSeconds: undefined,
    externalLoadKg: 10,
    assistance: 'none',
    leverageLevel: 'full',
    loadPlacement: 'dip-belt',
    qualityScore: quality,
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
}

describe('Replacement engine', () => {
  it('blocks replacement when equipment missing', () => {
    const decision = decideReplacement({
      userId: 'u',
      gymExercise: pulldown,
      calisthenicsNode: weightedPullUpNode,
      currentSkillAttempts: [makeAttempt(5), makeAttempt(5), makeAttempt(5)],
      equipmentAvailable: ['bar'],
      weeklyVolumeForMuscle: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 0, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 },
      sessionTimeMinutes: 45,
      painFree: true
    });
    expect(decision.allowed).toBe(false);
  });

  it('blocks replacement when volume too low', () => {
    const decision = decideReplacement({
      userId: 'u',
      gymExercise: pulldown,
      calisthenicsNode: weightedPullUpNode,
      currentSkillAttempts: [makeAttempt(5), makeAttempt(5), makeAttempt(5)],
      equipmentAvailable: ['bar', 'dip-belt', 'plates'],
      weeklyVolumeForMuscle: { muscleId: 'lats', directSets: 4, estimatedEffectiveSets: 0, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 },
      sessionTimeMinutes: 45,
      painFree: true
    });
    expect(decision.allowed).toBe(false);
  });

  it('blocks replacement when pain present', () => {
    const decision = decideReplacement({
      userId: 'u',
      gymExercise: pulldown,
      calisthenicsNode: weightedPullUpNode,
      currentSkillAttempts: [makeAttempt(5)],
      equipmentAvailable: ['bar', 'dip-belt', 'plates'],
      weeklyVolumeForMuscle: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 0, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 },
      sessionTimeMinutes: 45,
      painFree: false
    });
    expect(decision.allowed).toBe(false);
  });

  it('allows 100% replacement when skill is consistent and productive', () => {
    const decision = decideReplacement({
      userId: 'u',
      gymExercise: pulldown,
      calisthenicsNode: weightedPullUpNode,
      currentSkillAttempts: Array.from({ length: 6 }, () => makeAttempt(5)),
      equipmentAvailable: ['bar', 'dip-belt', 'plates'],
      weeklyVolumeForMuscle: { muscleId: 'lats', directSets: 10, estimatedEffectiveSets: 0, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 },
      sessionTimeMinutes: 45,
      painFree: true
    });
    expect(decision.allowed).toBe(true);
    expect(decision.percentage).toBe(100);
  });
});
