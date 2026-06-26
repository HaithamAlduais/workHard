import { describe, it, expect } from 'vitest';
import { decideStrengthProgression, decideSkillProgression } from '../src/index.js';
import type { SkillNode, SkillAttempt, SkillQualityDimensions } from '../src/types.js';

const skillNode: SkillNode = {
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
  targetQuality: 0.75,
  unlockRule: { requiredExposures: 3, requiredSuccessfulExposures: 2, minQuality: 0.75, requiresVideo: false, requiresCoach: false, expertLocked: false },
  regressRule: { failedExposures: 3, minQuality: 0.75, painBlocks: true },
  volumeRule: 'DYNAMIC_FULL_SET',
  prerequisites: ['assisted-pull-up'],
  progressions: ['weighted-pull-up'],
  regressions: ['assisted-pull-up'],
  replacementCandidates: ['pulldown']
};

const baseQuality: SkillQualityDimensions = {
  bodyLine: 0.8,
  scapularPosition: 0.8,
  elbowPosition: 0.8,
  symmetry: 0.8,
  stability: 0.8,
  momentum: 0.8,
  rom: 0.8,
  control: 0.8
};

function makeSkillAttempt(sessionId: string, dayOffset: number, overrides: Partial<SkillAttempt> = {}): SkillAttempt {
  const completedAt = new Date();
  completedAt.setDate(completedAt.getDate() + dayOffset);
  return {
    id: `${sessionId}-${dayOffset}`,
    userId: 'u',
    skillNodeId: skillNode.id,
    workoutSessionId: sessionId,
    completedAt,
    repetitions: 6,
    holdSeconds: undefined,
    validHoldSeconds: undefined,
    externalLoadKg: 0,
    assistance: 'none',
    leverageLevel: 'full',
    loadPlacement: 'none',
    qualityScore: 0.8,
    qualityDimensions: baseQuality,
    painLevel: 0,
    fullRom: true,
    videoVerified: false,
    coachVerified: false,
    selfReported: false,
    ...overrides
  };
}

function makeSession(sessionId: string, dayOffset: number, count: number): SkillAttempt[] {
  return Array.from({ length: count }, (_, i) => makeSkillAttempt(sessionId, dayOffset, { id: `${sessionId}-${i}` }));
}

describe('Progression windows', () => {
  it('strength progression uses only the latest session', () => {
    const today = Array.from({ length: 3 }, () => ({
      reps: 6,
      rir: 1,
      rom: 'full' as const,
      form: 'good' as const,
      painLevel: 0
    }));

    const decision = decideStrengthProgression({
      exerciseId: 'bench-press',
      targetRange: { min: 4, max: 6 },
      currentLoadKg: 100,
      lastSets: today,
      bodyRegion: 'upper',
      smallestPlateKg: 1.25
    });

    expect(decision.type).toBe('ADD_LOAD');
  });

  it('does not let historical low-rep sets contaminate today\'s decision', () => {
    const historicalLowRep = Array.from({ length: 3 }, () => ({
      reps: 2,
      rir: 0,
      rom: 'full' as const,
      form: 'acceptable' as const,
      painLevel: 0
    }));

    const today = Array.from({ length: 3 }, () => ({
      reps: 6,
      rir: 1,
      rom: 'full' as const,
      form: 'good' as const,
      painLevel: 0
    }));

    const contaminated = decideStrengthProgression({
      exerciseId: 'bench-press',
      targetRange: { min: 4, max: 6 },
      currentLoadKg: 100,
      lastSets: [...historicalLowRep, ...today],
      bodyRegion: 'upper',
      smallestPlateKg: 1.25
    });

    expect(contaminated.type).not.toBe('ADD_LOAD');

    const windowed = decideStrengthProgression({
      exerciseId: 'bench-press',
      targetRange: { min: 4, max: 6 },
      currentLoadKg: 100,
      lastSets: today,
      bodyRegion: 'upper',
      smallestPlateKg: 1.25
    });

    expect(windowed.type).toBe('ADD_LOAD');
  });

  it('skill progression uses multiple distinct exposures', () => {
    const attempts = [
      ...makeSession('session-a', 0, 3),
      ...makeSession('session-b', 2, 3),
      ...makeSession('session-c', 4, 3)
    ];

    const decision = decideSkillProgression(skillNode, attempts);
    expect(decision.type).toBe('UNLOCK_NEXT_NODE');
    expect((decision as any).targetNodeId).toBe('weighted-pull-up');
  });

  it('does not unlock a skill from a single session binge', () => {
    const attempts = makeSession('session-only', 0, 9);
    const decision = decideSkillProgression(skillNode, attempts);
    expect(decision.type).toBe('MAINTAIN_NODE');
  });
});
