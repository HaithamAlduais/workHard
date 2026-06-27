import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const EQUIPMENT_IDS = [
  'pull-up-bar',
  'rings',
  'parallettes',
  'dip-bars',
  'bands',
  'weight-vest',
  'dip-belt',
  'plates',
  'backpack',
  'nordic-anchor',
  'sliders',
  'bench',
  'box',
  'exercise-mat',
  'medicine-ball',
  'wall',
  'park'
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export interface EquipmentState {
  owned: Record<string, boolean>;
  // actions
  toggleOwned: (equipmentId: string) => void;
  setOwned: (equipmentId: string, owned: boolean) => void;
  getOwnedList: () => string[];
  hasEquipment: (equipmentIds: string[]) => boolean;
  hasAnyEquipment: (equipmentIds: string[]) => boolean;
  resetEquipment: () => void;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      owned: {},

      toggleOwned: (equipmentId) => {
        set((state) => ({
          owned: { ...state.owned, [equipmentId]: !state.owned[equipmentId] }
        }));
      },

      setOwned: (equipmentId, owned) => {
        set((state) => ({
          owned: { ...state.owned, [equipmentId]: owned }
        }));
      },

      getOwnedList: () => {
        const { owned } = get();
        return EQUIPMENT_IDS.filter((id) => owned[id]);
      },

      hasEquipment: (equipmentIds) => {
        const { owned } = get();
        return equipmentIds.every((id) => owned[id]);
      },

      hasAnyEquipment: (equipmentIds) => {
        const { owned } = get();
        return equipmentIds.some((id) => owned[id]);
      },

      resetEquipment: () => {
        set({ owned: {} });
      }
    }),
    {
      name: 'gravitypath-equipment',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
