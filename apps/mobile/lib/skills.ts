import {
  getSkillNode,
  calculateQualityScore,
  type SkillNode,
  type SkillAttempt,
  type SkillQualityDimensions,
  type LoggedSet
} from '@gravitypath/domain';
import { useSkillStore, type UserSkillAttempt } from '../stores/skillStore';

function formScore(form: LoggedSet['form']): number {
  switch (form) {
    case 'good':
      return 1;
    case 'acceptable':
      return 0.7;
    case 'poor':
      return 0.4;
    default:
      return 0.7;
  }
}

function romScore(rom: LoggedSet['rom']): number {
  switch (rom) {
    case 'full':
      return 1;
    case 'partial':
      return 0.75;
    case 'assisted':
      return 0.5;
    default:
      return 1;
  }
}

function powerScore(quality?: LoggedSet['powerQuality']): number {
  switch (quality) {
    case 'fast':
      return 1;
    case 'acceptable':
      return 0.8;
    case 'slower':
      return 0.6;
    default:
      return 1;
  }
}

function painScore(painLevel: number): number {
  if (painLevel === 0) return 1;
  if (painLevel === 1) return 0.7;
  return 0.3;
}

export function setToSkillQuality(set: LoggedSet): { dimensions: SkillQualityDimensions; score: number } {
  const base = formScore(set.form) * romScore(set.rom) * powerScore(set.powerQuality) * painScore(set.painLevel);
  const clamped = Math.max(0, Math.min(1, Number(base.toFixed(2))));
  const dimensions: SkillQualityDimensions = {
    bodyLine: clamped,
    scapularPosition: clamped,
    elbowPosition: clamped,
    symmetry: clamped,
    stability: clamped,
    momentum: clamped,
    rom: clamped,
    control: clamped
  };
  return { dimensions, score: calculateQualityScore(dimensions) };
}

export function setToSkillAttempt(set: LoggedSet, sessionId: string, node: SkillNode): SkillAttempt {
  const { dimensions, score } = setToSkillQuality(set);
  const isStatic = node.staticOrDynamic === 'static';
  return {
    id: `${node.id}-${set.id}`,
    userId: 'local',
    skillNodeId: node.id,
    workoutSessionId: sessionId,
    completedAt: new Date(set.completedAt ?? Date.now()),
    repetitions: isStatic ? undefined : set.reps,
    holdSeconds: isStatic ? set.holdSeconds : undefined,
    validHoldSeconds: isStatic ? set.holdSeconds : undefined,
    externalLoadKg: set.loadKg,
    assistance: 'none',
    leverageLevel: 'full',
    loadPlacement: 'none',
    qualityScore: score,
    qualityDimensions: dimensions,
    painLevel: set.painLevel,
    fullRom: set.rom === 'full',
    videoVerified: false,
    coachVerified: false,
    selfReported: true
  };
}

export function setsToUserSkillAttempts(sets: LoggedSet[], sessionId: string): UserSkillAttempt[] {
  const attempts: UserSkillAttempt[] = [];
  for (const set of sets) {
    const node = getSkillNode(set.exerciseId);
    if (!node) continue;
    const { dimensions, score } = setToSkillQuality(set);
    const isStatic = node.staticOrDynamic === 'static';
    attempts.push({
      skillNodeId: node.id,
      workoutSessionId: sessionId,
      completedAt: set.completedAt ?? new Date().toISOString(),
      repetitions: isStatic ? undefined : set.reps,
      holdSeconds: isStatic ? set.holdSeconds : undefined,
      validHoldSeconds: isStatic ? set.holdSeconds : undefined,
      externalLoadKg: set.loadKg,
      assistance: 'none',
      leverageLevel: 'full',
      loadPlacement: 'none',
      qualityScore: score,
      qualityDimensions: dimensions,
      painLevel: set.painLevel,
      fullRom: set.rom === 'full',
      videoVerified: false,
      coachVerified: false
    });
  }
  return attempts;
}

export function recordSkillAttemptsFromWorkout(sets: LoggedSet[], sessionId: string): void {
  const attempts = setsToUserSkillAttempts(sets, sessionId);
  for (const attempt of attempts) {
    useSkillStore.getState().recordAttempt(attempt);
  }
}
