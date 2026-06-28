import { describe, it, expect } from 'vitest';
import { buildCoachMessage, buildCoachMessages } from '../lib/coach';

describe('buildCoachMessage', () => {
  it('explains an exercise add_load state', () => {
    const msg = buildCoachMessage({
      exercise_id: 'bench-press',
      program_day_id: 'day1',
      currentLoad: 82.5,
      targetRepRange: { min: 4, max: 6 },
      progressionState: 'add_load'
    } as any);
    expect(msg).toContain('82.5 kg');
    expect(msg).toContain('more weight');
  });

  it('explains a skill unlock_next state', () => {
    const msg = buildCoachMessage({
      currentNode: 'strict-pull-up',
      targetRepsOrHoldSeconds: 5,
      targetSets: 3,
      leverageLevel: 'full',
      assistance: 'none',
      status: 'active_primary',
      progressionState: 'unlock_next'
    } as any);
    expect(msg).toContain('Strict Pull-up');
    expect(msg).toContain('next progression is available');
  });

  it('explains a safety hold state', () => {
    const msg = buildCoachMessage({
      currentNode: 'weighted-pull-up',
      targetRepsOrHoldSeconds: 4,
      targetSets: 3,
      leverageLevel: 'full',
      assistance: 'none',
      status: 'safety_hold',
      progressionState: 'hold_safety'
    } as any);
    expect(msg).toContain('safety concern');
  });
});

describe('buildCoachMessages', () => {
  it('includes a primary skill focus message', () => {
    const messages = buildCoachMessages({
      progressionDecisions: [],
      pendingSets: 0,
      nextScheduledDate: new Date().toISOString(),
      trainingDays: [1, 3, 5],
      priority: {
        primarySkillFamilyId: 'handstand',
        secondarySkillFamilyIds: [],
        maintenanceSkillFamilyIds: [],
        inactiveSkillFamilyIds: [],
        goalTemplate: 'advanced_calisthenics',
        blockStart: null,
        blockEnd: null,
        blockLengthWeeks: 12
      } as any,
      skillPrescriptions: {
        'handstand-wall': {
          skill_family_id: 'handstand',
          currentNode: 'handstand-wall',
          status: 'active_primary'
        } as any
      }
    });
    expect(messages.some((m) => m.title === 'Primary Skill Focus')).toBe(true);
  });

  it('warns when movement patterns are not home-ready', () => {
    const readiness = new Map([
      ['VERTICAL_PUSH', { pattern: 'VERTICAL_PUSH', equipmentReady: false, performanceReady: true, volumeReady: true, timeReady: true, painFree: true, blockers: ['No home equipment'] }]
    ]);
    const messages = buildCoachMessages({
      progressionDecisions: [],
      pendingSets: 0,
      nextScheduledDate: new Date().toISOString(),
      trainingDays: [1, 3, 5],
      priority: { primarySkillFamilyId: 'handstand' } as any,
      skillPrescriptions: {},
      readiness
    });
    expect(messages.some((m) => m.title === 'Home Readiness' && m.tone === 'warning')).toBe(true);
  });

  it('flags pending sync sets', () => {
    const messages = buildCoachMessages({
      progressionDecisions: [],
      pendingSets: 3,
      nextScheduledDate: new Date().toISOString(),
      trainingDays: [1, 3, 5],
      priority: { primarySkillFamilyId: 'handstand' } as any,
      skillPrescriptions: {}
    });
    expect(messages.some((m) => m.title === 'Sync')).toBe(true);
  });
});
