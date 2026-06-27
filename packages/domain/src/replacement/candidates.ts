import type { Exercise, ReplacementDecision, SkillAttempt, SkillNode, SkillUnlockState } from '../types.js';
import { SKILL_NODES } from '../skills/graph.js';
import { decideReplacement } from './engine.js';

export interface ReplacementCandidateInput {
  userId: string;
  gymExercise: Exercise;
  equipmentOwned: string[];
  unlockStates: Map<string, SkillUnlockState>;
  skillAttempts: SkillAttempt[];
  weeklyVolumeForMuscle: { muscleId: string; directSets: number };
  sessionTimeMinutes: number;
  painFree: boolean;
}

export interface ReplacementCandidateResult {
  gymExerciseId: string;
  calisthenicsNode: SkillNode;
  decision: ReplacementDecision;
  qualityAttempts: SkillAttempt[];
}

export function findReplacementCandidatesForGymExercise(
  input: ReplacementCandidateInput
): ReplacementCandidateResult | undefined {
  const { gymExercise } = input;

  const candidates = SKILL_NODES.filter((node) => {
    if (!node.replacementCandidates.includes(gymExercise.id)) return false;
    const state = input.unlockStates.get(node.id);
    return state?.status === 'unlocked' || state?.status === 'mastered';
  }).sort((a, b) => b.stage - a.stage);

  for (const calisthenicsNode of candidates) {
    const currentSkillAttempts = input.skillAttempts.filter((a) => a.skillNodeId === calisthenicsNode.id);
    const decision = decideReplacement({
      userId: input.userId,
      gymExercise,
      calisthenicsNode,
      currentSkillAttempts,
      equipmentAvailable: input.equipmentOwned,
      weeklyVolumeForMuscle: {
        muscleId: input.weeklyVolumeForMuscle.muscleId,
        directSets: input.weeklyVolumeForMuscle.directSets,
        estimatedEffectiveSets: 0,
        staticExposureSeconds: 0,
        techniqueSets: 0,
        powerSets: 0
      },
      sessionTimeMinutes: input.sessionTimeMinutes,
      painFree: input.painFree
    });

    if (decision.allowed && decision.percentage > 0) {
      return {
        gymExerciseId: gymExercise.id,
        calisthenicsNode,
        decision,
        qualityAttempts: currentSkillAttempts
      };
    }
  }

  return undefined;
}
