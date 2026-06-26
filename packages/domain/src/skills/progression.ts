import type { SkillNode, SkillAttempt, SkillDecision, SkillQualityDimensions } from '../types.js';

function groupAttemptsByExposure(attempts: SkillAttempt[]): SkillAttempt[][] {
  const bySession = new Map<string, SkillAttempt[]>();
  for (const a of attempts) {
    const key = a.workoutSessionId ?? a.completedAt.toISOString().split('T')[0];
    const list = bySession.get(key) ?? [];
    list.push(a);
    bySession.set(key, list);
  }
  return Array.from(bySession.values()).sort((a, b) => a[0].completedAt.getTime() - b[0].completedAt.getTime());
}

function bestAttemptPerExposure(attempts: SkillAttempt[]): SkillAttempt[] {
  const exposures = groupAttemptsByExposure(attempts);
  return exposures.map((exposureAttempts) =>
    exposureAttempts.reduce((best, current) => (current.qualityScore > best.qualityScore ? current : best), exposureAttempts[0])
  );
}

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

  const exposureBest = bestAttemptPerExposure(recentAttempts);
  const validExposures = exposureBest.filter((a) => a.qualityScore >= node.targetQuality && a.painLevel === 0);
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
    return decideStaticSkillProgression(node, exposureBest, validExposures);
  }

  return decideDynamicSkillProgression(node, exposureBest, validExposures);
}

function decideStaticSkillProgression(
  node: SkillNode,
  exposureBest: SkillAttempt[],
  validExposures: SkillAttempt[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.holdSecondsMin || !dose.holdSecondsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Static node missing dose definition.' };
  }

  const sufficientCount = validExposures.length >= node.unlockRule.requiredSuccessfulExposures;
  const holds = exposureBest.filter((a) => (a.validHoldSeconds ?? 0) >= dose.holdSecondsMin!);
  const medianHold = median(holds.map((a) => a.validHoldSeconds ?? 0));

  if (sufficientCount && medianHold >= dose.holdSecondsMax) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Met hold target (${dose.holdSecondsMax}s) on ${validExposures.length} exposures with acceptable quality. Unlock next progression.`
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

  if (validExposures.length >= node.unlockRule.requiredExposures && medianHold >= dose.holdSecondsMin) {
    return { type: 'ADD_HOLD_TIME', reason: 'Quality holds meet minimum duration. Push hold time toward target.' };
  }

  if (exposureBest.length >= node.regressRule.failedExposures && holds.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `Failed to reach minimum hold duration on ${exposureBest.length} exposures. Regress to build quality.`
      };
    }
  }

  return { type: 'MAINTAIN_NODE', reason: 'Static practice ongoing. Maintain current node and focus on quality.' };
}

function decideDynamicSkillProgression(
  node: SkillNode,
  exposureBest: SkillAttempt[],
  validExposures: SkillAttempt[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.repsMin || !dose.repsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Dynamic node missing dose definition.' };
  }

  const sufficientCount = validExposures.length >= node.unlockRule.requiredSuccessfulExposures;
  const allAtTop = validExposures.length >= node.unlockRule.requiredExposures &&
    validExposures.every((a) => (a.repetitions ?? 0) >= dose.repsMax!);

  if (allAtTop && sufficientCount) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Reached ${dose.repsMax} reps across ${validExposures.length} quality exposures. Unlock next progression.`
      };
    }
    if (node.volumeRule === 'WEIGHTED_DYNAMIC_FULL_SET') {
      return { type: 'ADD_LOAD', reason: 'Top of rep range mastered. Add the smallest load increment and reset reps.' };
    }
    return { type: 'REDUCE_ASSISTANCE', reason: 'Top of rep range mastered. Reduce assistance or advance leverage.' };
  }

  if (validExposures.length >= node.unlockRule.requiredExposures) {
    const medianReps = median(validExposures.map((a) => a.repetitions ?? 0));
    if (medianReps >= dose.repsMin && medianReps < dose.repsMax) {
      return { type: 'ADD_REP', reason: `Reps within target range. Add one rep toward ${dose.repsMax}.` };
    }
  }

  if (exposureBest.length >= node.regressRule.failedExposures && validExposures.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `No quality exposures in ${exposureBest.length} attempts. Regress to rebuild form.`
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
