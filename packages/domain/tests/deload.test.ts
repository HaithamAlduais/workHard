import { describe, it, expect } from 'vitest';
import { decideDeload } from '../src/index.js';

describe('Deload engine', () => {
  it('returns no deload when no triggers', () => {
    const decision = decideDeload({
      regressingExercises: 0,
      failedSets: 0,
      skillQualityDeclining: false,
      jointIrritation: false,
      readinessLow: false,
      setAdditionFatigue: false,
      userRequested: false,
      straightArmToleranceDecline: false
    });
    expect(decision.deload).toBe(false);
  });

  it('triggers deload when user requests', () => {
    const decision = decideDeload({
      regressingExercises: 0,
      failedSets: 0,
      skillQualityDeclining: false,
      jointIrritation: false,
      readinessLow: false,
      setAdditionFatigue: false,
      userRequested: true,
      straightArmToleranceDecline: false
    });
    expect(decision.deload).toBe(true);
    expect(decision.loadReductionPercent).toBe(10);
    expect(decision.setReductionPercent).toBe(50);
  });

  it('triggers deload on multiple triggers', () => {
    const decision = decideDeload({
      regressingExercises: 2,
      failedSets: 3,
      skillQualityDeclining: false,
      jointIrritation: false,
      readinessLow: false,
      setAdditionFatigue: false,
      userRequested: false,
      straightArmToleranceDecline: false
    });
    expect(decision.deload).toBe(true);
  });
});
