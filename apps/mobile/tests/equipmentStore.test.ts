// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { useEquipmentStore } from '../stores/equipmentStore';

function resetStore() {
  useEquipmentStore.setState({
    owned: {}
  });
}

describe('equipmentStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts empty', () => {
    expect(useEquipmentStore.getState().getOwnedList()).toEqual([]);
  });

  it('toggles equipment ownership', () => {
    useEquipmentStore.getState().toggleOwned('pull-up-bar');
    expect(useEquipmentStore.getState().getOwnedList()).toContain('pull-up-bar');
    useEquipmentStore.getState().toggleOwned('pull-up-bar');
    expect(useEquipmentStore.getState().getOwnedList()).not.toContain('pull-up-bar');
  });

  it('supports setOwned and batch queries', () => {
    useEquipmentStore.getState().setOwned('rings', true);
    useEquipmentStore.getState().setOwned('box', true);
    expect(useEquipmentStore.getState().hasEquipment(['rings', 'box'])).toBe(true);
    expect(useEquipmentStore.getState().hasEquipment(['rings', 'wall'])).toBe(false);
    expect(useEquipmentStore.getState().hasAnyEquipment(['wall', 'box'])).toBe(true);
  });

  it('reset clears inventory', () => {
    useEquipmentStore.getState().setOwned('parallettes', true);
    useEquipmentStore.getState().resetEquipment();
    expect(useEquipmentStore.getState().getOwnedList()).toEqual([]);
  });
});
