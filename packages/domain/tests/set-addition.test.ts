import { describe, it, expect } from 'vitest';
import { decideSetAddition } from '../src/index.js';

describe('Set-addition engine', () => {
  it('does not add sets in first 4 weeks', () => {
    const decision = decideSetAddition({
      exerciseOrSkillId: 'bench',
      phaseWeeks: 2,
      exposuresSinceProgress: 3,
      effortAppropriate: true,
      formAcceptable: true,
      sorenessNormal: true,
      painFree: true,
      adherencePercent: 0.9,
      sessionWithinTime: true,
      broadFatigue: false,
      atVolumeCap: false,
      weeksSinceLastAddition: 3
    });
    expect(decision.addSet).toBe(false);
    expect(decision.reason).toContain('First four weeks');
  });

  it('adds a set when plateau and recovery conditions met', () => {
    const decision = decideSetAddition({
      exerciseOrSkillId: 'bench',
      phaseWeeks: 6,
      exposuresSinceProgress: 2,
      effortAppropriate: true,
      formAcceptable: true,
      sorenessNormal: true,
      painFree: true,
      adherencePercent: 0.9,
      sessionWithinTime: true,
      broadFatigue: false,
      atVolumeCap: false,
      weeksSinceLastAddition: 3
    });
    expect(decision.addSet).toBe(true);
  });

  it('blocks set addition when pain present', () => {
    const decision = decideSetAddition({
      exerciseOrSkillId: 'bench',
      phaseWeeks: 6,
      exposuresSinceProgress: 2,
      effortAppropriate: true,
      formAcceptable: true,
      sorenessNormal: true,
      painFree: false,
      adherencePercent: 0.9,
      sessionWithinTime: true,
      broadFatigue: false,
      atVolumeCap: false,
      weeksSinceLastAddition: 3
    });
    expect(decision.addSet).toBe(false);
  });
});
