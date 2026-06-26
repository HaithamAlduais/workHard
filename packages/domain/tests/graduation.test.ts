import { describe, it, expect } from 'vitest';
import { evaluateGraduation } from '../src/index.js';
import type { GraduationContract, MovementPatternReadiness, SkillUnlockState, GraduationRequirement } from '../src/types.js';

function makeReadiness(pattern: string): MovementPatternReadiness {
  return {
    pattern: pattern as any,
    equipmentReady: true,
    performanceReady: true,
    volumeReady: true,
    timeReady: true,
    painFree: true,
    supportingExerciseOrSkill: `${pattern}-skill`
  };
}

describe('Graduation engine', () => {
  it('blocks graduation when movement pattern not home-ready', () => {
    const contract: GraduationContract = {
      id: 'c1',
      userId: 'u',
      template: 'PRACTICAL_HOME_INDEPENDENCE',
      requirements: [
        { type: 'MOVEMENT_PATTERN_READY', targetMovementPattern: 'VERTICAL_PULL' },
        { type: 'MOVEMENT_PATTERN_READY', targetMovementPattern: 'KNEE_FLEXION' }
      ],
      status: 'active'
    };
    const readiness = new Map<string, MovementPatternReadiness>([
      ['VERTICAL_PULL', makeReadiness('VERTICAL_PULL')],
      ['KNEE_FLEXION', { ...makeReadiness('KNEE_FLEXION'), performanceReady: false }]
    ]);
    const decision = evaluateGraduation(contract, new Map(), readiness);
    expect(decision.complete).toBe(false);
    expect(decision.progressPercent).toBe(50);
    expect(decision.reason).toContain('blocked');
  });

  it('completes graduation and generates four-week transition', () => {
    const contract: GraduationContract = {
      id: 'c1',
      userId: 'u',
      template: 'PRACTICAL_HOME_INDEPENDENCE',
      requirements: [
        { type: 'SKILL_UNLOCKED', targetSkillNodeId: 'weighted-pull-up' },
        { type: 'MOVEMENT_PATTERN_READY', targetMovementPattern: 'VERTICAL_PULL' }
      ],
      status: 'active'
    };
    const unlocks = new Map<string, SkillUnlockState>([
      ['weighted-pull-up', { nodeId: 'weighted-pull-up', status: 'unlocked', reason: '' }]
    ]);
    const readiness = new Map<string, MovementPatternReadiness>([
      ['VERTICAL_PULL', makeReadiness('VERTICAL_PULL')]
    ]);
    const decision = evaluateGraduation(contract, unlocks, readiness);
    expect(decision.complete).toBe(true);
    expect(decision.fourWeekTransition).toBeDefined();
    expect(decision.fourWeekTransition!.week1.gymPercent).toBe(75);
    expect(decision.fourWeekTransition!.week4.homePercent).toBe(100);
  });
});
