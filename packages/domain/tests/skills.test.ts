import { describe, it, expect } from 'vitest';
import { decideSkillProgression, calculateQualityScore, evaluateSkillUnlock, buildUnlockGraph } from '../src/index.js';
import type { SkillNode, SkillAttempt, SkillQualityDimensions } from '../src/types.js';

const baseNode: SkillNode = {
  id: 'strict-pull-up',
  familyId: 'pull-up',
  name: 'Strict Pull-up',
  nameAr: 'سحب صارم',
  stage: 5,
  difficulty: 'intermediate',
  apparatus: ['bar'],
  staticOrDynamic: 'dynamic',
  bentOrStraightArm: 'bent',
  role: 'strength',
  riskLevel: 'medium',
  targetDose: { sets: 3, repsMin: 4, repsMax: 6, weeklyExposures: 2 },
  targetQuality: 0.7,
  unlockRule: { requiredExposures: 3, requiredSuccessfulExposures: 2, minQuality: 0.7, requiresVideo: false, requiresCoach: false, expertLocked: false },
  regressRule: { failedExposures: 3, minQuality: 0.7, painBlocks: true },
  volumeRule: 'DYNAMIC_FULL_SET',
  prerequisites: ['eccentric-pull-up'],
  progressions: ['weighted-pull-up'],
  regressions: ['eccentric-pull-up'],
  replacementCandidates: ['pulldown']
};

const staticNode: SkillNode = {
  ...baseNode,
  id: 'tuck-front-lever',
  familyId: 'front-lever',
  name: 'Tuck Front Lever',
  nameAr: 'ذراع مستقيم أمامي',
  stage: 3,
  staticOrDynamic: 'static',
  targetDose: { sets: 4, holdSecondsMin: 6, holdSecondsMax: 10, weeklyExposures: 2 },
  progressions: ['advanced-tuck-front-lever'],
  regressions: ['active-hang']
};

function makeAttempt(nodeId: string, values: Partial<SkillAttempt>, dims: Partial<SkillQualityDimensions> = {}): SkillAttempt {
  const defaults: SkillQualityDimensions = {
    bodyLine: 0.8,
    scapularPosition: 0.8,
    elbowPosition: 0.8,
    symmetry: 0.8,
    stability: 0.8,
    momentum: 0.8,
    rom: 0.8,
    control: 0.8
  };
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
    qualityDimensions: { ...defaults, ...dims },
    painLevel: 0,
    fullRom: true,
    videoVerified: false,
    coachVerified: false,
    selfReported: false,
    ...values
  };
}

describe('Dynamic skill progression', () => {
  it('unlocks next node when rep target met across quality exposures', () => {
    const attempts = [
      makeAttempt('strict-pull-up', { repetitions: 6 }),
      makeAttempt('strict-pull-up', { repetitions: 6 }),
      makeAttempt('strict-pull-up', { repetitions: 6 })
    ];
    const decision = decideSkillProgression(baseNode, attempts);
    expect(decision.type).toBe('UNLOCK_NEXT_NODE');
    expect((decision as any).targetNodeId).toBe('weighted-pull-up');
  });

  it('adds reps when within range but not at top', () => {
    const attempts = [
      makeAttempt('strict-pull-up', { repetitions: 4 }),
      makeAttempt('strict-pull-up', { repetitions: 5 }),
      makeAttempt('strict-pull-up', { repetitions: 4 })
    ];
    const decision = decideSkillProgression(baseNode, attempts);
    expect(decision.type).toBe('ADD_REP');
  });

  it('holds progression on pain', () => {
    const attempts = [makeAttempt('strict-pull-up', { repetitions: 6, painLevel: 2 })];
    const decision = decideSkillProgression(baseNode, attempts);
    expect(decision.type).toBe('HOLD_FOR_SAFETY');
  });

  it('stops block on 20% quality drop', () => {
    const attempts = [
      makeAttempt('strict-pull-up', { repetitions: 6, qualityScore: 1.0 }),
      makeAttempt('strict-pull-up', { repetitions: 5, qualityScore: 0.6 })
    ];
    const decision = decideSkillProgression(baseNode, attempts);
    expect(decision.type).toBe('STOP_BLOCK_DUE_TO_QUALITY_DROP');
  });

  it('does not add load and leverage simultaneously', () => {
    const attempts = [makeAttempt('strict-pull-up', { repetitions: 6, qualityScore: 0.8 })];
    const decision = decideSkillProgression(baseNode, attempts);
    expect(decision.type).not.toBe('ADD_LOAD');
  });
});

describe('Static skill progression', () => {
  it('advances leverage when hold target met', () => {
    const attempts = [
      makeAttempt('tuck-front-lever', { holdSeconds: 10, validHoldSeconds: 10 }),
      makeAttempt('tuck-front-lever', { holdSeconds: 10, validHoldSeconds: 10 }),
      makeAttempt('tuck-front-lever', { holdSeconds: 10, validHoldSeconds: 10 })
    ];
    const decision = decideSkillProgression(staticNode, attempts);
    expect(decision.type).toBe('UNLOCK_NEXT_NODE');
  });

  it('adds hold time when minimum met', () => {
    const attempts = [
      makeAttempt('tuck-front-lever', { holdSeconds: 7, validHoldSeconds: 7 }),
      makeAttempt('tuck-front-lever', { holdSeconds: 7, validHoldSeconds: 7 })
    ];
    const decision = decideSkillProgression(staticNode, attempts);
    expect(decision.type).toBe('ADD_HOLD_TIME');
  });
});

describe('Skill unlock', () => {
  it('locks when prerequisites not met', () => {
    const prereq = { nodeId: 'eccentric-pull-up', status: 'locked' as const, reason: '' };
    const state = evaluateSkillUnlock(baseNode, [prereq], []);
    expect(state.status).toBe('locked');
  });

  it('unlocks when prerequisites and quality met', () => {
    const prereq = { nodeId: 'eccentric-pull-up', status: 'unlocked' as const, reason: '' };
    const attempts = [
      makeAttempt('strict-pull-up', { repetitions: 5, qualityScore: 0.8 }),
      makeAttempt('strict-pull-up', { repetitions: 5, qualityScore: 0.8 })
    ];
    const state = evaluateSkillUnlock(baseNode, [prereq], attempts);
    expect(state.status).toBe('unlocked');
  });

  it('requires coach confirmation for expert-locked nodes', () => {
    const expertNode = { ...baseNode, id: 'iron-cross', unlockRule: { ...baseNode.unlockRule, expertLocked: true } };
    const prereq = { nodeId: 'eccentric-pull-up', status: 'unlocked' as const, reason: '' };
    const state = evaluateSkillUnlock(expertNode, [prereq], [makeAttempt('iron-cross', { repetitions: 5, qualityScore: 0.9 })]);
    expect(state.status).toBe('locked');
  });
});

describe('Quality score', () => {
  it('averages all dimensions', () => {
    const score = calculateQualityScore({
      bodyLine: 1,
      scapularPosition: 1,
      elbowPosition: 1,
      symmetry: 0.5,
      stability: 0.5,
      momentum: 0.5,
      rom: 1,
      control: 1
    });
    expect(score).toBe(0.81);
  });
});
