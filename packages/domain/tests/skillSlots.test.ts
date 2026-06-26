import { describe, it, expect } from 'vitest';
import {
  validateSkillPriority,
  checkSkillPriorityConflicts,
  generateSkillSlotsForDay,
  updateSkillPrescriptionStatuses,
  type SkillPriority,
  type SkillSlot,
  type SkillPrescription
} from '../src/skills/skillSlots.js';
import { getHybridProgramDay } from '../src/programs/curriculum.js';
import { getSkillNode } from '../src/skills/graph.js';

function basePriority(overrides: Partial<SkillPriority> = {}): SkillPriority {
  return {
    primarySkillFamilyId: 'handstand',
    secondarySkillFamilyIds: [],
    maintenanceSkillFamilyIds: [],
    inactiveSkillFamilyIds: [],
    goalTemplate: 'advanced_calisthenics',
    blockStart: null,
    blockEnd: null,
    blockLengthWeeks: 4,
    ...overrides
  };
}

function emptyPrescriptions(): Record<string, SkillPrescription> {
  return {};
}

function emptyUnlocks(): Map<string, { status: 'locked' | 'available' | 'unlocked' | 'mastered' | 'safety_hold'; reason: string }> {
  return new Map();
}

describe('validateSkillPriority', () => {
  it('requires exactly one primary', () => {
    const result = validateSkillPriority(basePriority({ primarySkillFamilyId: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Select a primary skill.');
  });

  it('allows up to two secondaries', () => {
    const result = validateSkillPriority(
      basePriority({ secondarySkillFamilyIds: ['muscle-up', 'front-lever', 'planche'] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('You can select up to two secondary skills.');
  });

  it('rejects a family appearing in two categories', () => {
    const result = validateSkillPriority(
      basePriority({ secondarySkillFamilyIds: ['handstand'] })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('handstand'))).toBe(true);
  });

  it('accepts a valid priority', () => {
    const result = validateSkillPriority(basePriority({ secondarySkillFamilyIds: ['muscle-up'] }));
    expect(result.valid).toBe(true);
  });
});

describe('checkSkillPriorityConflicts', () => {
  it('warns when multiple straight-arm push families are active', () => {
    const warnings = checkSkillPriorityConflicts(
      basePriority({ primarySkillFamilyId: 'handstand', secondarySkillFamilyIds: ['planche'] }),
      emptyPrescriptions()
    );
    expect(warnings.some((w) => w.type === 'redundant_straight_arm_push')).toBe(true);
  });

  it('warns when straight-arm push and pull are both active', () => {
    const warnings = checkSkillPriorityConflicts(
      basePriority({ primarySkillFamilyId: 'planche', secondarySkillFamilyIds: ['front-lever'] }),
      emptyPrescriptions()
    );
    expect(warnings.some((w) => w.type === 'high_straight_arm_load')).toBe(true);
  });

  it('warns when expert rings is primary without prerequisites', () => {
    const warnings = checkSkillPriorityConflicts(
      basePriority({ primarySkillFamilyId: 'expert-rings' }),
      emptyPrescriptions()
    );
    expect(warnings.some((w) => w.type === 'expert_prerequisites_missing')).toBe(true);
  });
});

describe('generateSkillSlotsForDay', () => {
  it('schedules handstand primary on Day 1', () => {
    const priority = basePriority({ primarySkillFamilyId: 'handstand' });
    const slots = generateSkillSlotsForDay('day1', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].familyId).toBe('handstand');
    expect(slots[0].status).toBe('active_primary');
  });

  it('schedules muscle-up primary on Day 2 and pull support on Day 1', () => {
    const priority = basePriority({ primarySkillFamilyId: 'muscle-up' });
    const day2 = generateSkillSlotsForDay('day2', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    const day1 = generateSkillSlotsForDay('day1', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(day2.some((s) => s.familyId === 'muscle-up' && s.status === 'active_primary')).toBe(true);
    expect(day1.some((s) => s.familyId === 'muscle-up')).toBe(true);
  });

  it('schedules front-lever primary on Day 3', () => {
    const priority = basePriority({ primarySkillFamilyId: 'front-lever' });
    const slots = generateSkillSlotsForDay('day3', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(slots.some((s) => s.familyId === 'front-lever' && s.status === 'active_primary')).toBe(true);
  });

  it('does not schedule inactive families', () => {
    const priority = basePriority({
      primarySkillFamilyId: 'handstand',
      inactiveSkillFamilyIds: ['muscle-up']
    });
    const slots = generateSkillSlotsForDay('day2', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(slots.every((s) => s.familyId !== 'muscle-up')).toBe(true);
  });

  it('uses default maintenance slot when no active family matches the day', () => {
    const priority = basePriority({ primarySkillFamilyId: 'pistol' });
    const slots = generateSkillSlotsForDay('day1', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].status).toBe('maintenance');
  });

  it('caps slots per day at two', () => {
    const priority = basePriority({
      primarySkillFamilyId: 'handstand',
      secondarySkillFamilyIds: ['muscle-up', 'front-lever']
    });
    const slots = generateSkillSlotsForDay('day1', {
      priority,
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    expect(slots.length).toBeLessThanOrEqual(2);
  });
});

describe('updateSkillPrescriptionStatuses', () => {
  it('marks primary family as active_primary', () => {
    const prescriptions: Record<string, SkillPrescription> = {
      'handstand-wall': {
        skill_node_id: 'handstand-wall',
        skill_family_id: 'handstand'
      } as SkillPrescription,
      'muscle-up': {
        skill_node_id: 'muscle-up',
        skill_family_id: 'muscle-up'
      } as SkillPrescription
    };
    const statuses = updateSkillPrescriptionStatuses(
      basePriority({ primarySkillFamilyId: 'handstand', secondarySkillFamilyIds: ['muscle-up'] }),
      prescriptions,
      emptyUnlocks()
    );
    expect(statuses['handstand-wall']).toBe('active_primary');
    expect(statuses['muscle-up']).toBe('active_secondary');
  });

  it('overrides active status with safety_hold', () => {
    const prescriptions: Record<string, SkillPrescription> = {
      'handstand-wall': {
        skill_node_id: 'handstand-wall',
        skill_family_id: 'handstand',
        activeSafetyHold: true
      } as SkillPrescription
    };
    const statuses = updateSkillPrescriptionStatuses(
      basePriority({ primarySkillFamilyId: 'handstand' }),
      prescriptions,
      emptyUnlocks()
    );
    expect(statuses['handstand-wall']).toBe('safety_hold');
  });
});

describe('getHybridProgramDay', () => {
  it('keeps stable gym blocks when generating dynamic skill slots', () => {
    const result = getHybridProgramDay('day1', {
      priority: basePriority({ primarySkillFamilyId: 'handstand' }),
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    const exerciseIds = result.day.exercises.map((e) => e.exerciseId);
    expect(exerciseIds).toContain('back-squat');
    expect(exerciseIds).toContain('box-jump');
    expect(exerciseIds.some((id) => getSkillNode(id)?.familyId === 'handstand')).toBe(true);
  });

  it('replaces fixed skill slots with dynamically chosen ones', () => {
    const result = getHybridProgramDay('day1', {
      priority: basePriority({ primarySkillFamilyId: 'planche' }),
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks()
    });
    const firstSkill = result.day.exercises.find((e) => e.orderClass === 'TECHNIQUE_FIRST');
    expect(firstSkill?.familyId ?? firstSkill?.exerciseId).toContain('planche');
  });

  it('does not remove required skill work when trimming accessories', () => {
    const result = getHybridProgramDay('day1', {
      priority: basePriority({ primarySkillFamilyId: 'handstand' }),
      skillPrescriptions: emptyPrescriptions(),
      unlockStates: emptyUnlocks(),
      availableMinutes: 20
    });
    const exerciseIds = result.day.exercises.map((e) => e.exerciseId);
    expect(exerciseIds.some((id) => getSkillNode(id)?.familyId === 'handstand')).toBe(true);
    expect(result.removedBlocks.length).toBeGreaterThan(0);
    expect(result.removedBlocks.every((b) => b.tier > 2)).toBe(true);
  });
});
