import { describe, it, expect } from 'vitest';
import {
  evaluateMovementPatternReadiness,
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
