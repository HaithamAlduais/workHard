import type { SkillNode, SkillAttempt, SkillDecision, SkillQualityDimensions } from '../types.js';

export function decideSkillProgression(
  node: SkillNode,
  recentAttempts: SkillAttempt[],
  requestedDeload: boolean = false
): SkillDecision {
  if (requestedDeload) {
    return { type: 'DELOAD_SKILL', reason: 'Deload requested. Maintain easy skill practice without new unlocks.' };
  }

  if (recentAttempts.some((a) => a.painLevel >= 2)) {
    return { type: 'HOLD_FOR_SAFETY', reason: 'Pain reported during skill practice. Hold progression until pain-free.' };
  }

  const validAttempts = recentAttempts.filter((a) => a.qualityScore >= node.targetQuality && a.painLevel === 0);
  const qualityDrop = detectQualityDrop(recentAttempts, node.targetQuality);

  if (qualityDrop) {
    return {
      type: 'STOP_BLOCK_DUE_TO_QUALITY_DROP',
      reason: 'Quality dropped ~20% within the skill block. Stop to avoid bad repetitions.'
    };
  }

  if (node.unlockRule.expertLocked) {
    const verified = recentAttempts.some((a) => a.coachVerified || a.videoVerified);
    if (!verified) {
      return {
        type: 'REQUIRE_COACH_CONFIRMATION',
        reason: 'Expert-locked node requires coach or verified-video confirmation before progression.'
      };
    }
  }

  if (node.staticOrDynamic === 'static') {
    return decideStaticSkillProgression(node, recentAttempts, validAttempts);
  }

  return decideDynamicSkillProgression(node, recentAttempts, validAttempts);
}

function decideStaticSkillProgression(
  node: SkillNode,
  recentAttempts: SkillAttempt[],
  validAttempts: SkillAttempt[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.holdSecondsMin || !dose.holdSecondsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Static node missing dose definition.' };
  }

  const sufficientCount = validAttempts.length >= node.unlockRule.requiredSuccessfulExposures;
  const holds = recentAttempts.filter((a) => (a.validHoldSeconds ?? 0) >= dose.holdSecondsMin!);
  const medianHold = median(holds.map((a) => a.validHoldSeconds ?? 0));

  if (sufficientCount && medianHold >= dose.holdSecondsMax) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Met hold target (${dose.holdSecondsMax}s) on ${validAttempts.length} exposures with acceptable quality. Unlock next progression.`
      };
    }
    return { type: 'ADD_LOAD', reason: 'At maximum leverage and hold target. Add external load carefully.' };
  }

  if (medianHold >= dose.holdSecondsMax) {
    return {
      type: 'INCREASE_LEVERAGE',
      reason: `Hold duration target reached consistently. Advance leverage or reduce assistance, not both.`
    };
  }

  if (sufficientCount && medianHold >= dose.holdSecondsMin) {
    return { type: 'ADD_HOLD_TIME', reason: 'Quality holds meet minimum duration. Push hold time toward target.' };
  }

  if (recentAttempts.length >= node.regressRule.failedExposures && holds.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `Failed to reach minimum hold duration on ${recentAttempts.length} exposures. Regress to build quality.`
      };
    }
  }

  return { type: 'MAINTAIN_NODE', reason: 'Static practice ongoing. Maintain current node and focus on quality.' };
}

function decideDynamicSkillProgression(
  node: SkillNode,
  recentAttempts: SkillAttempt[],
  validAttempts: SkillAttempt[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.repsMin || !dose.repsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Dynamic node missing dose definition.' };
  }

  const sufficientCount = validAttempts.length >= node.unlockRule.requiredSuccessfulExposures;
  const allAtTop = validAttempts.length >= node.unlockRule.requiredExposures &&
    validAttempts.every((a) => (a.repetitions ?? 0) >= dose.repsMax!);

  if (allAtTop && sufficientCount) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Reached ${dose.repsMax} reps across ${validAttempts.length} quality exposures. Unlock next progression.`
      };
    }
    if (node.volumeRule === 'WEIGHTED_DYNAMIC_FULL_SET') {
      return { type: 'ADD_LOAD', reason: 'Top of rep range mastered. Add the smallest load increment and reset reps.' };
    }
    return { type: 'REDUCE_ASSISTANCE', reason: 'Top of rep range mastered. Reduce assistance or advance leverage.' };
  }

  if (validAttempts.length >= node.unlockRule.requiredExposures) {
    const medianReps = median(validAttempts.map((a) => a.repetitions ?? 0));
    if (medianReps >= dose.repsMin && medianReps < dose.repsMax) {
      return { type: 'ADD_REP', reason: `Reps within target range. Add one rep toward ${dose.repsMax}.` };
    }
  }

  if (recentAttempts.length >= node.regressRule.failedExposures && validAttempts.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `No quality exposures in ${recentAttempts.length} attempts. Regress to rebuild form.`
      };
    }
  }

  return { type: 'MAINTAIN_NODE', reason: 'Dynamic skill practice ongoing. Maintain current node and add reps first.' };
}

function detectQualityDrop(attempts: SkillAttempt[], targetQuality: number): boolean {
  if (attempts.length < 2) return false;
  const sorted = [...attempts].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  const first = sorted[0].qualityScore;
  const last = sorted[sorted.length - 1].qualityScore;
  if (first === 0) return false;
  const drop = (first - last) / first;
  return drop >= 0.2 && last < targetQuality;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function calculateQualityScore(dimensions: SkillQualityDimensions): number {
  const keys: (keyof SkillQualityDimensions)[] = ['bodyLine', 'scapularPosition', 'elbowPosition', 'symmetry', 'stability', 'momentum', 'rom', 'control'];
  const sum = keys.reduce((acc, key) => acc + (dimensions[key] ?? 0), 0);
  return Number((sum / keys.length).toFixed(2));
}
