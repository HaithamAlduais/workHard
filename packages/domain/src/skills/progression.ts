import type { SkillNode, SkillAttempt, SkillDecision, SkillQualityDimensions, SkillExposureAggregate } from '../types.js';

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

export function aggregateSkillExposures(node: SkillNode, attempts: SkillAttempt[]): SkillExposureAggregate[] {
  const requiredSets = node.targetDose.sets ?? 1;
  const exposures = groupAttemptsByExposure(attempts);
  return exposures.map((exposureAttempts) => {
    const sorted = [...exposureAttempts].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    const workoutSessionId = sorted[0].workoutSessionId ?? sorted[0].completedAt.toISOString().split('T')[0];
    const attemptedSets = sorted.length;
    const validAttempts = sorted.filter(
      (a) => a.qualityScore >= node.targetQuality && a.painLevel === 0 && a.fullRom
    );
    const validSets = validAttempts.length;
    const validReps = validAttempts.map((a) => a.repetitions ?? 0).filter((r) => r > 0);
    const validHolds = validAttempts.map((a) => a.validHoldSeconds ?? 0).filter((h) => h > 0);
    const qualities = sorted.map((a) => a.qualityScore);

    return {
      workoutSessionId,
      attemptedSets,
      validSets,
      requiredSets,
      bestReps: validReps.length > 0 ? Math.max(...validReps) : undefined,
      medianReps: validReps.length > 0 ? median(validReps) : undefined,
      bestHoldSeconds: validHolds.length > 0 ? Math.max(...validHolds) : undefined,
      medianHoldSeconds: validHolds.length > 0 ? median(validHolds) : undefined,
      totalValidHoldSeconds: validHolds.length > 0 ? validHolds.reduce((a, b) => a + b, 0) : undefined,
      minimumQuality: Math.min(...qualities),
      averageQuality: Number((qualities.reduce((a, b) => a + b, 0) / qualities.length).toFixed(2)),
      painReported: sorted.some((a) => a.painLevel > 0)
    };
  });
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

  const exposures = aggregateSkillExposures(node, recentAttempts);
  const successfulExposures = exposures.filter((e) => !e.painReported && e.validSets >= e.requiredSets);
  const failedExposures = exposures.filter((e) => e.painReported || e.validSets < e.requiredSets);
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
    return decideStaticSkillProgression(node, exposures, successfulExposures, failedExposures);
  }

  return decideDynamicSkillProgression(node, exposures, successfulExposures, failedExposures);
}

function decideStaticSkillProgression(
  node: SkillNode,
  _exposures: SkillExposureAggregate[],
  successfulExposures: SkillExposureAggregate[],
  failedExposures: SkillExposureAggregate[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.holdSecondsMin || !dose.holdSecondsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Static node missing dose definition.' };
  }

  const sufficientCount = successfulExposures.length >= node.unlockRule.requiredSuccessfulExposures;
  const medianHold = median(successfulExposures.map((e) => e.medianHoldSeconds ?? 0));

  if (sufficientCount && medianHold >= dose.holdSecondsMax) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Met hold target (${dose.holdSecondsMax}s) on ${successfulExposures.length} exposures with acceptable quality. Unlock next progression.`
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

  if (successfulExposures.length >= node.unlockRule.requiredExposures && medianHold >= dose.holdSecondsMin) {
    return { type: 'ADD_HOLD_TIME', reason: 'Quality holds meet minimum duration. Push hold time toward target.' };
  }

  if (failedExposures.length >= node.regressRule.failedExposures && successfulExposures.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `Failed to reach minimum hold duration on ${failedExposures.length} exposures. Regress to build quality.`
      };
    }
  }

  return { type: 'MAINTAIN_NODE', reason: 'Static practice ongoing. Maintain current node and focus on quality.' };
}

function decideDynamicSkillProgression(
  node: SkillNode,
  _exposures: SkillExposureAggregate[],
  successfulExposures: SkillExposureAggregate[],
  failedExposures: SkillExposureAggregate[]
): SkillDecision {
  const dose = node.targetDose;
  if (!dose.repsMin || !dose.repsMax || !dose.sets) {
    return { type: 'MAINTAIN_NODE', reason: 'Dynamic node missing dose definition.' };
  }

  const sufficientCount = successfulExposures.length >= node.unlockRule.requiredSuccessfulExposures;
  const medianReps = median(successfulExposures.map((e) => e.medianReps ?? 0));
  const allAtTop =
    successfulExposures.length >= node.unlockRule.requiredExposures &&
    successfulExposures.every((e) => (e.medianReps ?? 0) >= dose.repsMax!);

  if (allAtTop && sufficientCount) {
    if (node.progressions.length > 0) {
      return {
        type: 'UNLOCK_NEXT_NODE',
        targetNodeId: node.progressions[0],
        reason: `Reached ${dose.repsMax} reps across ${successfulExposures.length} quality exposures. Unlock next progression.`
      };
    }
    if (node.volumeRule === 'WEIGHTED_DYNAMIC_FULL_SET') {
      return { type: 'ADD_LOAD', reason: 'Top of rep range mastered. Add the smallest load increment and reset reps.' };
    }
    return { type: 'REDUCE_ASSISTANCE', reason: 'Top of rep range mastered. Reduce assistance or advance leverage.' };
  }

  if (successfulExposures.length >= node.unlockRule.requiredExposures) {
    if (medianReps >= dose.repsMin && medianReps < dose.repsMax) {
      return { type: 'ADD_REP', reason: `Reps within target range. Add one rep toward ${dose.repsMax}.` };
    }
  }

  if (failedExposures.length >= node.regressRule.failedExposures && successfulExposures.length === 0) {
    if (node.regressions.length > 0) {
      return {
        type: 'REGRESS_NODE',
        targetNodeId: node.regressions[0],
        reason: `No quality exposures in ${failedExposures.length} attempts. Regress to rebuild form.`
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
