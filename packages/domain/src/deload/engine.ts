import type { DeloadInput, DeloadDecision } from '../types.js';

export function decideDeload(input: DeloadInput): DeloadDecision {
  const {
    regressingExercises,
    failedSets,
    skillQualityDeclining,
    jointIrritation,
    readinessLow,
    setAdditionFatigue,
    userRequested,
    straightArmToleranceDecline
  } = input;

  const triggers = [
    regressingExercises >= 2,
    failedSets >= 3,
    skillQualityDeclining,
    jointIrritation,
    readinessLow,
    setAdditionFatigue,
    userRequested,
    straightArmToleranceDecline
  ];

  const triggerCount = triggers.filter(Boolean).length;

  if (triggerCount === 0) {
    return { deload: false, durationDays: 0, loadReductionPercent: 0, setReductionPercent: 0, reason: 'No deload triggers present.' };
  }

  if (triggerCount >= 2 || userRequested) {
    return {
      deload: true,
      durationDays: 7,
      loadReductionPercent: 10,
      setReductionPercent: 50,
      reason: `Deload triggered: ${triggerCount} trigger(s). One week at ~50% sets and ~10% lower load.`
    };
  }

  if (jointIrritation || straightArmToleranceDecline) {
    return {
      deload: true,
      durationDays: 7,
      loadReductionPercent: 10,
      setReductionPercent: 50,
      reason: 'Joint or straight-arm tolerance concern. Reduce load and volume, omit high-tension statics.'
    };
  }

  return {
    deload: false,
    durationDays: 0,
    loadReductionPercent: 0,
    setReductionPercent: 0,
    reason: 'Single minor trigger. Monitor next session before deload.'
  };
}
