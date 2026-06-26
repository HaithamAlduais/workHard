import type { ReplacementInput, ReplacementDecision, SkillAttempt } from '../types.js';

export function decideReplacement(input: ReplacementInput): ReplacementDecision {
  const { gymExercise, calisthenicsNode, currentSkillAttempts, equipmentAvailable, weeklyVolumeForMuscle, sessionTimeMinutes, painFree } = input;

  const conditions: string[] = [];

  if (!painFree) {
    return { allowed: false, percentage: 0, reason: 'Pain reported. Replacement blocked for safety.', conditions };
  }

  if (gymExercise.role === 'POWER_ONLY') {
    return { allowed: false, percentage: 0, reason: 'Power exercises are not automatically replaced with calisthenics.', conditions };
  }

  const requiredEquipment = calisthenicsNode.apparatus;
  const hasEquipment = requiredEquipment.every((eq) => equipmentAvailable.includes(eq));
  if (!hasEquipment) {
    conditions.push(`Missing equipment: ${requiredEquipment.filter((eq) => !equipmentAvailable.includes(eq)).join(', ')}`);
    return { allowed: false, percentage: 0, reason: 'Required equipment not available.', conditions };
  }

  const recent = currentSkillAttempts.slice(-6);
  const qualityAttempts = recent.filter((a) => a.qualityScore >= calisthenicsNode.targetQuality && a.painLevel === 0);
  const minRepsOrHold = calisthenicsNode.staticOrDynamic === 'static'
    ? recent.some((a) => (a.validHoldSeconds ?? 0) >= (calisthenicsNode.targetDose.holdSecondsMin ?? 0))
    : recent.some((a) => (a.repetitions ?? 0) >= (calisthenicsNode.targetDose.repsMin ?? 0));

  if (qualityAttempts.length < 2 || !minRepsOrHold) {
    conditions.push('Insufficient quality skill exposures to replace gym work.');
    return { allowed: false, percentage: 0, reason: 'Skill not yet ready for replacement. Need at least two quality exposures.', conditions };
  }

  if (weeklyVolumeForMuscle.directSets < 6) {
    conditions.push('Weekly volume too low to safely replace gym work.');
    return { allowed: false, percentage: 0, reason: 'Weekly muscle volume too low. Build base volume before replacement.', conditions };
  }

  if (sessionTimeMinutes > 55) {
    conditions.push('Session already time-constrained.');
    return { allowed: false, percentage: 0, reason: 'Session would exceed 60 minutes. Replacement postponed.', conditions };
  }

  if (qualityAttempts.length >= 6 && calisthenicsNode.volumeRule !== 'TECHNIQUE_NO_VOLUME') {
    conditions.push('Skill is strength-productive and consistent.');
    return { allowed: true, percentage: 100, reason: 'Skill consistently productive. Full replacement approved.', conditions };
  }

  if (qualityAttempts.length >= 4) {
    conditions.push('Skill quality consistent. Gradual replacement recommended.');
    return { allowed: true, percentage: 75, reason: 'Skill quality consistent. Replace 75% of gym sets.', conditions };
  }

  if (qualityAttempts.length >= 3) {
    conditions.push('Skill quality emerging. Partial replacement.');
    return { allowed: true, percentage: 50, reason: 'Skill quality emerging. Replace 50% of gym sets.', conditions };
  }

  conditions.push('Minimum replacement threshold met.');
  return { allowed: true, percentage: 25, reason: 'Minimum skill threshold met. Replace 25% of gym sets as trial.', conditions };
}
