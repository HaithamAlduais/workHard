import type { ProgramDay, ProgramExerciseSpec } from '../programs/curriculum.js';
import type { ReplacementDecision, SkillNode } from '../types.js';
import { getExerciseById } from '../exercises/catalog.js';
import { findReplacementCandidatesForGymExercise, type ReplacementCandidateInput } from './candidates.js';

export interface ReplacementEvaluationInput {
  userId: string;
  equipmentOwned: string[];
  unlockStates: Map<string, import('../types.js').SkillUnlockState>;
  skillAttempts: import('../types.js').SkillAttempt[];
  weeklyVolumeByMuscle: Record<string, { muscleId: string; directSets: number }>;
  sessionTimeMinutes: number;
  painFree: boolean;
}

export interface ReplacementEvaluationResult {
  decisions: Map<string, { decision: ReplacementDecision; calisthenicsNode: SkillNode }>;
  estimatedSessionTimeMinutes: number;
}

export function evaluateReplacementsForDay(
  day: ProgramDay,
  input: ReplacementEvaluationInput
): ReplacementEvaluationResult {
  const decisions = new Map<string, { decision: ReplacementDecision; calisthenicsNode: SkillNode }>();
  let estimatedSessionTimeMinutes = input.sessionTimeMinutes;

  for (const ex of day.exercises) {
    const gymExercise = getExerciseById(ex.exerciseId);
    if (!gymExercise || !gymExercise.canBeReplaced) continue;

    const muscleVolume = input.weeklyVolumeByMuscle[gymExercise.primaryMuscleIds[0] ?? 'unknown'] ?? {
      muscleId: gymExercise.primaryMuscleIds[0] ?? 'unknown',
      directSets: 0
    };

    const candidateInput: ReplacementCandidateInput = {
      userId: input.userId,
      gymExercise,
      equipmentOwned: input.equipmentOwned,
      unlockStates: input.unlockStates,
      skillAttempts: input.skillAttempts,
      weeklyVolumeForMuscle: muscleVolume,
      sessionTimeMinutes: estimatedSessionTimeMinutes,
      painFree: input.painFree
    };

    const result = findReplacementCandidatesForGymExercise(candidateInput);
    if (result) {
      decisions.set(ex.exerciseId, {
        decision: result.decision,
        calisthenicsNode: result.calisthenicsNode
      });
      // Each replacement adds a little time; update estimate for subsequent decisions.
      estimatedSessionTimeMinutes += 3;
    }
  }

  return { decisions, estimatedSessionTimeMinutes };
}

function buildReplacementSpec(
  original: ProgramExerciseSpec,
  node: SkillNode,
  homeSets: number
): ProgramExerciseSpec {
  const isStatic = node.staticOrDynamic === 'static';
  const orderClass: ProgramExerciseSpec['orderClass'] =
    node.role === 'strength' ? 'STRENGTH_SKILL' : node.role === 'skill' ? 'STRENGTH_SKILL' : 'HYPERTROPHY_SKILL';

  return {
    id: `${original.id}-replacement-${node.id}`,
    exerciseId: node.id,
    name: node.name,
    nameAr: node.nameAr,
    orderClass,
    role: node.role,
    targetSets: homeSets,
    targetRepsMin: isStatic ? undefined : node.targetDose.repsMin,
    targetRepsMax: isStatic ? undefined : node.targetDose.repsMax,
    targetHoldSeconds: isStatic ? node.targetDose.holdSecondsMin : undefined,
    restSeconds: 90,
    isReplacement: true
  };
}

export function applyReplacementToDay(
  day: ProgramDay,
  decisions: Map<string, { decision: ReplacementDecision; calisthenicsNode: SkillNode }>
): ProgramDay {
  const exercises: ProgramExerciseSpec[] = [];

  for (const ex of day.exercises) {
    const replacement = decisions.get(ex.exerciseId);
    if (!replacement) {
      exercises.push(ex);
      continue;
    }

    const { decision, calisthenicsNode } = replacement;
    const totalSets = ex.targetSets;
    const pct = decision.percentage;

    let homeSets: number;
    if (pct === 100) {
      homeSets = totalSets;
    } else {
      homeSets = Math.max(1, Math.round((totalSets * pct) / 100));
    }
    const gymSets = totalSets - homeSets;

    if (gymSets > 0) {
      exercises.push({
        ...ex,
        targetSets: gymSets,
        replacementPercentage: pct
      });
    }

    if (homeSets > 0) {
      exercises.push(buildReplacementSpec(ex, calisthenicsNode, homeSets));
    }
  }

  return {
    ...day,
    exercises
  };
}
