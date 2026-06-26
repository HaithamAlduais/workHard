import { describe, it, expect } from 'vitest';
import { classifySetVolume, classifySkillVolume, aggregateVolume, calculateRelativeWeightedLoad, calculateSystemLoad } from '../src/index.js';
import type { Exercise, SetLog, SkillNode, SkillAttempt } from '../src/types.js';

const bench: Exercise = {
  id: 'bench',
  movementPatternId: 'horizontal-push',
  name: 'Bench Press',
  nameAr: 'ضغط أفقي',
  role: 'STRENGTH_AND_HYPERTROPHY',
  orderClass: 'GYM_STRENGTH',
  equipmentIds: ['barbell', 'bench'],
  primaryMuscleIds: ['chest'],
  secondaryMuscleIds: ['triceps', 'front-delt'],
  requiresGym: true,
  canBeReplaced: true,
  defaultWarmupSeconds: 180,
  defaultWorkingSetSeconds: 60,
  transitionSeconds: 60
};

const goodSet: SetLog = {
  id: 's1',
  sessionExerciseId: 'se1',
  setNumber: 1,
  loadKg: 80,
  repetitions: 5,
  rir: 2,
  rom: 'full',
  form: 'good',
  painLevel: 0,
  restSecondsPlanned: 180,
  restSecondsActual: 185,
  completedAt: new Date()
};

describe('Volume classification', () => {
  it('counts full-ROM good sets as direct sets', () => {
    const entry = classifySetVolume(bench, goodSet, 'primary');
    expect(entry.directSets).toBe(1);
    expect(entry.techniqueSets).toBe(0);
  });

  it('excludes painful sets', () => {
    const painful = { ...goodSet, painLevel: 2 };
    const entry = classifySetVolume(bench, painful, 'primary');
    expect(entry.directSets).toBe(0);
  });

  it('excludes technique-only sets from hypertrophy volume', () => {
    const techExercise: Exercise = { ...bench, role: 'TECHNIQUE_ONLY' };
    const entry = classifySetVolume(techExercise, goodSet, 'primary');
    expect(entry.directSets).toBe(0);
    expect(entry.techniqueSets).toBe(1);
  });

  it('keeps static exposure separate from dynamic sets', () => {
    const node: SkillNode = {
      id: 'tuck-fl',
      familyId: 'front-lever',
      name: 'Tuck FL',
      nameAr: 'ذراع مستقيم',
      stage: 1,
      difficulty: 'intermediate',
      apparatus: ['bar'],
      staticOrDynamic: 'static',
      bentOrStraightArm: 'straight',
      role: 'skill',
      riskLevel: 'medium',
      targetDose: { sets: 4, holdSecondsMin: 6, holdSecondsMax: 10 },
      targetQuality: 0.7,
      unlockRule: { requiredExposures: 2, requiredSuccessfulExposures: 2, minQuality: 0.7, requiresVideo: false, requiresCoach: false, expertLocked: false },
      regressRule: { failedExposures: 3, minQuality: 0.7, painBlocks: true },
      volumeRule: 'STATIC_EXPOSURE',
      prerequisites: [],
      progressions: [],
      regressions: [],
      replacementCandidates: []
    };
    const attempt: SkillAttempt = {
      id: 'a1',
      userId: 'u',
      skillNodeId: 'tuck-fl',
      completedAt: new Date(),
      holdSeconds: 8,
      validHoldSeconds: 8,
      externalLoadKg: 0,
      assistance: 'none',
      leverageLevel: 'tuck',
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
    const entry = classifySkillVolume(node, attempt);
    expect(entry.directSets).toBe(0);
    expect(entry.staticExposureSeconds).toBe(8);
  });
});

describe('Weighted calisthenics math', () => {
  it('calculates relative load', () => {
    expect(calculateRelativeWeightedLoad({ bodyweightKg: 80, externalLoadKg: 20 })).toBe(25);
  });

  it('calculates system load with assistance', () => {
    expect(calculateSystemLoad({ bodyweightKg: 80, externalLoadKg: 20, assistanceLoadKg: 10 })).toBe(90);
  });
});
