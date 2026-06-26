import type { GraduationContract, GraduationDecision, GraduationRequirement, MovementPatternReadiness, SkillNode, SkillUnlockState } from '../types.js';

export function evaluateGraduation(
  contract: GraduationContract,
  unlockStates: Map<string, SkillUnlockState>,
  readinessByPattern: Map<string, MovementPatternReadiness>
): GraduationDecision {
  const satisfied: GraduationRequirement[] = [];
  const remaining: GraduationRequirement[] = [];

  for (const req of contract.requirements) {
    const met = isRequirementMet(req, unlockStates, readinessByPattern);
    if (met) satisfied.push(req);
    else remaining.push(req);
  }

  const total = contract.requirements.length;
  const progressPercent = total === 0 ? 100 : Math.round((satisfied.length / total) * 100);
  const complete = remaining.length === 0;

  const movementPatterns = remaining.filter((r) => r.type === 'MOVEMENT_PATTERN_READY');
  if (movementPatterns.length > 0) {
    return {
      complete: false,
      progressPercent,
      remainingRequirements: remaining,
      satisfiedRequirements: satisfied,
      reason: `Graduation blocked: ${movementPatterns.length} movement pattern(s) not home-ready.`
    };
  }

  return {
    complete,
    progressPercent,
    remainingRequirements: remaining,
    satisfiedRequirements: satisfied,
    fourWeekTransition: complete ? {
      week1: { gymPercent: 75, homePercent: 25 },
      week2: { gymPercent: 50, homePercent: 50 },
      week3: { gymPercent: 25, homePercent: 75 },
      week4: { gymPercent: 0, homePercent: 100 }
    } : undefined,
    reason: complete
      ? 'Graduation contract complete. Initiate four-week transition to home independence.'
      : 'Graduation contract incomplete. Continue training.'
  };
}

function isRequirementMet(
  req: GraduationRequirement,
  unlockStates: Map<string, SkillUnlockState>,
  readinessByPattern: Map<string, MovementPatternReadiness>
): boolean {
  switch (req.type) {
    case 'SKILL_UNLOCKED': {
      if (!req.targetSkillNodeId) return false;
      const state = unlockStates.get(req.targetSkillNodeId);
      return state?.status === 'unlocked' || state?.status === 'mastered';
    }
    case 'SKILL_MASTERED': {
      if (!req.targetSkillNodeId) return false;
      const state = unlockStates.get(req.targetSkillNodeId);
      return state?.status === 'mastered';
    }
    case 'MOVEMENT_PATTERN_READY': {
      if (!req.targetMovementPattern) return false;
      const readiness = readinessByPattern.get(req.targetMovementPattern);
      return (
        !!readiness &&
        readiness.equipmentReady &&
        readiness.performanceReady &&
        readiness.volumeReady &&
        readiness.timeReady &&
        readiness.painFree
      );
    }
    case 'CUSTOM':
      return false;
    default:
      return false;
  }
}
