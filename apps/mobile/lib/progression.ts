import {
  decideStrengthProgression,
  decideHypertrophyProgression,
  decidePowerQuality,
  decideSkillProgression,
  getSkillNode,
  calculateQualityScore,
  type LoggedSet,
  type WorkoutExercise,
  type ActiveWorkoutState,
  type SkillAttempt,
  type SkillNode
} from '@gravitypath/domain';
import type { ProgressionDecision } from '../stores/workoutStore';

function bodyRegionFor(exerciseId: string): 'upper' | 'lower' | 'core' {
  const lower = ['squat', 'deadlift', 'pistol', 'calf', 'leg-curl', 'leg-extension', 'hack-squat', 'romanian'];
  if (lower.some((k) => exerciseId.includes(k))) return 'lower';
  return 'upper';
}

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

function skillQualityFromSet(set: LoggedSet): { dimensions: SkillAttempt['qualityDimensions']; score: number } {
  const base = formScore(set.form) * romScore(set.rom) * powerScore(set.powerQuality) * painScore(set.painLevel);
  const clamped = Math.max(0, Math.min(1, Number(base.toFixed(2))));
  const dimensions: SkillAttempt['qualityDimensions'] = {
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

function setToSkillAttempt(set: LoggedSet, sessionId: string, node: SkillNode): SkillAttempt {
  const { dimensions, score } = skillQualityFromSet(set);
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
    assistance: set.assistance ?? 'none',
    leverageLevel: set.leverageLevel ?? 'full',
    loadPlacement: set.loadPlacement ?? 'none',
    apparatus: set.apparatus,
    grip: set.grip,
    modifiers: set.modifiers,
    qualityScore: score,
    qualityDimensions: dimensions,
    painLevel: set.painLevel,
    fullRom: set.rom === 'full',
    videoVerified: false,
    coachVerified: false,
    selfReported: true
  };
}

export function evaluateExerciseProgression(
  exercise: WorkoutExercise,
  sets: LoggedSet[],
  sessionId: string,
  getSkillAttempts: (exerciseId: string) => SkillAttempt[]
): ProgressionDecision {
  const sessionSets = sets.filter((s) => s.workoutSessionId === sessionId && s.status === 'completed');
  const painReported = sessionSets.some((s) => s.painLevel >= 2);

  const skillNode = getSkillNode(exercise.exerciseId);
  if (skillNode) {
    const attempts = getSkillAttempts(exercise.exerciseId);
    const decision = decideSkillProgression(skillNode, attempts);
    return {
      exerciseId: exercise.exerciseId,
      decisionType: decision.type,
      targetNodeId: (decision as any).targetNodeId,
      reason: decision.reason,
      decidedAt: new Date().toISOString()
    };
  }

  const lastSets = sessionSets.map((s) => ({
    reps: exercise.targetHoldSeconds ? s.holdSeconds : s.reps,
    rir: s.rir,
    rom: s.rom,
    form: s.form,
    painLevel: s.painLevel
  }));

  const targetRange = {
    min: exercise.targetRepsMin ?? exercise.targetHoldSeconds ?? 1,
    max: exercise.targetRepsMax ?? exercise.targetHoldSeconds ?? 1
  };

  if (exercise.orderClass === 'POWER') {
    const decision = decidePowerQuality({
      exerciseId: exercise.exerciseId,
      sets: sessionSets.map((s) => ({ quality: s.powerQuality ?? 'acceptable' }))
    });
    return {
      exerciseId: exercise.exerciseId,
      decisionType: decision.type,
      reason: decision.reason,
      decidedAt: new Date().toISOString()
    };
  }

  if (exercise.targetHoldSeconds) {
    const anyPoorForm = sessionSets.some((s) => s.form === 'poor');
    const allAtTarget = sessionSets.length >= 2 && sessionSets.every((s) => s.holdSeconds >= targetRange.max);
    if (painReported || anyPoorForm) {
      return {
        exerciseId: exercise.exerciseId,
        decisionType: 'HOLD_FOR_SAFETY',
        reason: 'Pain or poor form recorded. Hold progression and recover quality.',
        decidedAt: new Date().toISOString()
      };
    }
    if (allAtTarget) {
      return {
        exerciseId: exercise.exerciseId,
        decisionType: 'ADVANCE_LEVERAGE',
        reason: `All holds reached ${targetRange.max}s. Advance leverage or reduce assistance next exposure.`,
        decidedAt: new Date().toISOString()
      };
    }
    return {
      exerciseId: exercise.exerciseId,
      decisionType: 'ADD_HOLD_TIME',
      reason: `Hold time target not yet consistent. Aim for ${targetRange.min}-${targetRange.max}s across all sets.`,
      decidedAt: new Date().toISOString()
    };
  }

  const bodyRegion = bodyRegionFor(exercise.exerciseId);

  if (exercise.orderClass === 'GYM_STRENGTH' || exercise.role === 'strength') {
    const decision = decideStrengthProgression({
      exerciseId: exercise.exerciseId,
      targetRange,
      currentLoadKg: exercise.targetLoadKg ?? 0,
      lastSets,
      bodyRegion,
      smallestPlateKg: 1.25,
      painReported
    });
    return {
      exerciseId: exercise.exerciseId,
      decisionType: decision.type,
      newTarget: decision.type === 'ADD_LOAD' ? { loadKg: (decision as any).newLoadKg } : undefined,
      reason: decision.reason,
      decidedAt: new Date().toISOString()
    };
  }

  const decision = decideHypertrophyProgression({
    exerciseId: exercise.exerciseId,
    targetRange,
    currentLoadKg: exercise.targetLoadKg ?? 0,
    lastSets,
    smallestPlateKg: 1.25,
    painReported
  });
  return {
    exerciseId: exercise.exerciseId,
    decisionType: decision.type,
    newTarget: decision.type === 'ADD_LOAD' ? { loadKg: (decision as any).newLoadKg } : undefined,
    reason: decision.reason,
    decidedAt: new Date().toISOString()
  };
}

export function generateProgressionDecisions(
  workout: ActiveWorkoutState,
  allSets: LoggedSet[],
  getSkillAttempts: (exerciseId: string) => SkillAttempt[]
): ProgressionDecision[] {
  const decisions: ProgressionDecision[] = [];
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      const sets = allSets.filter((s) => s.exerciseId === ex.id);
      if (sets.length === 0) continue;
      decisions.push(evaluateExerciseProgression(ex, sets, workout.id, getSkillAttempts));
    }
  }
  return decisions;
}
