// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';

function resetStore() {
  useSkillPriorityStore.setState({
    primarySkillFamilyId: 'handstand',
    secondarySkillFamilyIds: [],
    maintenanceSkillFamilyIds: [],
    inactiveSkillFamilyIds: [],
    goalTemplate: 'advanced_calisthenics',
    blockStart: null,
    blockEnd: null,
    blockLengthWeeks: 12,
    initialized: false
  });
}

describe('skillPriorityStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('defaults to handstand primary', () => {
    const state = useSkillPriorityStore.getState();
    expect(state.primarySkillFamilyId).toBe('handstand');
    expect(state.secondarySkillFamilyIds).toHaveLength(0);
  });

  it('sets primary and moves previous primary to maintenance', () => {
    const store = useSkillPriorityStore.getState();
    store.setPrimary('muscle-up');
    const state = useSkillPriorityStore.getState();
    expect(state.primarySkillFamilyId).toBe('muscle-up');
    expect(state.maintenanceSkillFamilyIds).toContain('handstand');
  });

  it('allows up to two secondaries', () => {
    const store = useSkillPriorityStore.getState();
    store.toggleSecondary('front-lever');
    store.toggleSecondary('planche');
    store.toggleSecondary('pistol');
    const state = useSkillPriorityStore.getState();
    expect(state.secondarySkillFamilyIds).toHaveLength(2);
  });

  it('moves secondary to maintenance when toggled off', () => {
    const store = useSkillPriorityStore.getState();
    store.toggleSecondary('front-lever');
    store.toggleSecondary('front-lever');
    const state = useSkillPriorityStore.getState();
    expect(state.secondarySkillFamilyIds).not.toContain('front-lever');
    expect(state.maintenanceSkillFamilyIds).toContain('front-lever');
  });

  it('rotates primary from secondary list', () => {
    const store = useSkillPriorityStore.getState();
    store.toggleSecondary('muscle-up');
    store.rotatePrimary();
    const state = useSkillPriorityStore.getState();
    expect(state.primarySkillFamilyId).toBe('muscle-up');
    expect(state.maintenanceSkillFamilyIds).toContain('handstand');
  });

  it('reports status for each family', () => {
    const store = useSkillPriorityStore.getState();
    store.toggleSecondary('front-lever');
    store.toggleInactive('pistol');
    expect(store.getStatusForFamily('handstand')).toBe('active_primary');
    expect(store.getStatusForFamily('front-lever')).toBe('active_secondary');
    expect(store.getStatusForFamily('pistol')).toBe('inactive');
    expect(store.getStatusForFamily('muscle-up')).toBe('maintenance');
  });
});
