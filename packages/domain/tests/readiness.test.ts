import { describe, it, expect } from 'vitest';
import {
  evaluateMovementPatternReadiness,
  evaluateEquipmentRequirement,
  getHomeReadinessPercent,
  getTopBlockers
} from '../src/index.js';
import type { ReadinessInput } from '../src/readiness/engine.js';
import type { SkillAttempt, SkillUnlockState } from '../src/types.js';

function makeAttempt(nodeId: string, overrides: Partial<SkillAttempt> = {}): SkillAttempt {
  return {
    id: 'a',
    userId: 'u',
    skillNodeId: nodeId,
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
    selfReported: false,
    ...overrides
  };
}

function makeInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    equipmentOwned: [],
    unlockStates: new Map<string, SkillUnlockState>(),
    skillAttempts: [],
    weeklyVolumeByMuscle: {},
    painFlaggedExerciseIds: [],
    sessionTimeMinutes: 50,
    ...overrides
  };
}

describe('Equipment requirement evaluation', () => {
  it('requires all items for allOf', () => {
    const req = { allOf: ['pull-up-bar'] };
    expect(evaluateEquipmentRequirement([], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['pull-up-bar'], req).satisfied).toBe(true);
  });

  it('requires at least one item for anyOf', () => {
    const req = { anyOf: ['nordic-anchor', 'sliders', 'rings'] };
    expect(evaluateEquipmentRequirement([], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['sliders'], req).satisfied).toBe(true);
  });

  it('supports grouped alternatives', () => {
    const req = {
      groups: [
        { allOf: ['pull-up-bar', 'dip-belt', 'plates'] },
        { allOf: ['pull-up-bar', 'weight-vest'] }
      ]
    };
    expect(evaluateEquipmentRequirement(['pull-up-bar'], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['pull-up-bar', 'dip-belt', 'plates'], req).satisfied).toBe(true);
    expect(evaluateEquipmentRequirement(['pull-up-bar', 'weight-vest'], req).satisfied).toBe(true);
  });

  it('requires allOf rings plus anyOf load for weighted ring push-up', () => {
    const req = { allOf: ['rings'], anyOf: ['weight-vest', 'backpack', 'plates'] };
    expect(evaluateEquipmentRequirement(['rings'], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['weight-vest'], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['rings', 'backpack'], req).satisfied).toBe(true);
  });

  it('supports hip hinge anyOf loadable implements', () => {
    const req = { anyOf: ['barbell', 'dumbbells', 'backpack', 'kettlebell'] };
    expect(evaluateEquipmentRequirement([], req).satisfied).toBe(false);
    expect(evaluateEquipmentRequirement(['dumbbells'], req).satisfied).toBe(true);
  });

  it('supports upper power anyOf space or implement', () => {
    const req = { anyOf: ['medicine-ball', 'park', 'open-space'] };
    expect(evaluateEquipmentRequirement(['park'], req).satisfied).toBe(true);
    expect(evaluateEquipmentRequirement(['open-space'], req).satisfied).toBe(true);
  });
});

describe('Home readiness engine', () => {
  it('marks VERTICAL_PULL home-ready when bar, strict pull-up, volume and time are satisfied', () => {
    const input = makeInput({
      equipmentOwned: ['pull-up-bar'],
      unlockStates: new Map([['strict-pull-up', { nodeId: 'strict-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [
        makeAttempt('strict-pull-up', { repetitions: 5, qualityScore: 0.8 }),
        makeAttempt('strict-pull-up', { repetitions: 5, qualityScore: 0.8 })
      ],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.equipmentReady).toBe(true);
    expect(result.performanceReady).toBe(true);
    expect(result.volumeReady).toBe(true);
    expect(result.timeReady).toBe(true);
    expect(result.painFree).toBe(true);
    expect(result.supportingExerciseOrSkill).toBe('Strict Pull-up');
  });

  it('flags VERTICAL_PULL when pull-up bar is missing', () => {
    const input = makeInput({
      equipmentOwned: [],
      unlockStates: new Map([['strict-pull-up', { nodeId: 'strict-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [makeAttempt('strict-pull-up'), makeAttempt('strict-pull-up')],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.equipmentReady).toBe(false);
    expect(result.blockers.some((b) => b.includes('Missing equipment'))).toBe(true);
  });

  it('flags VERTICAL_PULL when skill is unlocked but not consistent enough', () => {
    const input = makeInput({
      equipmentOwned: ['pull-up-bar'],
      unlockStates: new Map([['strict-pull-up', { nodeId: 'strict-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [makeAttempt('strict-pull-up')],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.performanceReady).toBe(false);
    expect(result.blockers.some((b) => b.includes('consistent'))).toBe(true);
  });

  it('weighted pull-up readiness fails with only pull-up bar', () => {
    const input = makeInput({
      equipmentOwned: ['pull-up-bar'],
      unlockStates: new Map([['weighted-pull-up', { nodeId: 'weighted-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [
        makeAttempt('weighted-pull-up', { repetitions: 5, qualityScore: 0.8, externalLoadKg: 10 }),
        makeAttempt('weighted-pull-up', { repetitions: 5, qualityScore: 0.8, externalLoadKg: 10 })
      ],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.equipmentReady).toBe(false);
  });

  it('weighted pull-up readiness passes with pull-up bar + dip belt + plates', () => {
    const input = makeInput({
      equipmentOwned: ['pull-up-bar', 'dip-belt', 'plates'],
      unlockStates: new Map([['weighted-pull-up', { nodeId: 'weighted-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [
        makeAttempt('weighted-pull-up', { repetitions: 5, qualityScore: 0.8, externalLoadKg: 10 }),
        makeAttempt('weighted-pull-up', { repetitions: 5, qualityScore: 0.8, externalLoadKg: 10 })
      ],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.equipmentReady).toBe(true);
    expect(result.performanceReady).toBe(true);
  });

  it('Nordic readiness passes with any one valid alternative', () => {
    const input = makeInput({
      equipmentOwned: ['sliders', 'exercise-mat'],
      unlockStates: new Map([['sliding-hamstring-curl', { nodeId: 'sliding-hamstring-curl', status: 'unlocked', reason: '' }]]),
      skillAttempts: [
        makeAttempt('sliding-hamstring-curl', { repetitions: 8, qualityScore: 0.75 }),
        makeAttempt('sliding-hamstring-curl', { repetitions: 8, qualityScore: 0.75 })
      ],
      weeklyVolumeByMuscle: {
        hamstrings: { muscleId: 'hamstrings', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('KNEE_FLEXION')!;
    expect(result.equipmentReady).toBe(true);
    expect(result.performanceReady).toBe(true);
  });

  it('weighted ring push-up fails without rings', () => {
    const input = makeInput({
      equipmentOwned: ['weight-vest'],
      unlockStates: new Map([['weighted-ring-push-up', { nodeId: 'weighted-ring-push-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [
        makeAttempt('weighted-ring-push-up', { repetitions: 6, qualityScore: 0.8 }),
        makeAttempt('weighted-ring-push-up', { repetitions: 6, qualityScore: 0.8 })
      ],
      weeklyVolumeByMuscle: {
        chest: { muscleId: 'chest', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      }
    });
    const result = evaluateMovementPatternReadiness(input).get('HORIZONTAL_PUSH')!;
    expect(result.equipmentReady).toBe(false);
  });

  it('reports readiness percent based on all 12 patterns', () => {
    const input = makeInput();
    const readiness = evaluateMovementPatternReadiness(input);
    expect(getHomeReadinessPercent(readiness)).toBe(0);
  });

  it('returns top blockers limited to 3 by default', () => {
    const input = makeInput();
    const readiness = evaluateMovementPatternReadiness(input);
    const blockers = getTopBlockers(readiness);
    expect(blockers.length).toBeLessThanOrEqual(3);
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('flags pain when a relevant exercise is pain-flagged', () => {
    const input = makeInput({
      equipmentOwned: ['pull-up-bar'],
      unlockStates: new Map([['strict-pull-up', { nodeId: 'strict-pull-up', status: 'unlocked', reason: '' }]]),
      skillAttempts: [makeAttempt('strict-pull-up'), makeAttempt('strict-pull-up')],
      weeklyVolumeByMuscle: {
        lats: { muscleId: 'lats', directSets: 8, estimatedEffectiveSets: 8, staticExposureSeconds: 0, techniqueSets: 0, powerSets: 0 }
      },
      painFlaggedExerciseIds: ['strict-pull-up']
    });
    const result = evaluateMovementPatternReadiness(input).get('VERTICAL_PULL')!;
    expect(result.painFree).toBe(false);
    expect(result.blockers.some((b) => b.includes('Pain'))).toBe(true);
  });
});
