import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SkillPriority, SkillPrescriptionStatus } from '@gravitypath/domain';

export interface SkillPriorityState extends SkillPriority {
  initialized: boolean;
  // actions
  setPrimary: (familyId: string) => void;
  toggleSecondary: (familyId: string) => void;
  toggleMaintenance: (familyId: string) => void;
  toggleInactive: (familyId: string) => void;
  setGoalTemplate: (template: SkillPriority['goalTemplate']) => void;
  startNewBlock: (lengthWeeks: number) => void;
  rotatePrimary: () => void;
  setPriority: (priority: Partial<SkillPriority>) => void;
  getStatusForFamily: (familyId: string) => SkillPrescriptionStatus;
}

const DEFAULT_PRIORITY: SkillPriority = {
  primarySkillFamilyId: 'handstand',
  secondarySkillFamilyIds: [],
  maintenanceSkillFamilyIds: [],
  inactiveSkillFamilyIds: [],
  goalTemplate: 'advanced_calisthenics',
  blockStart: null,
  blockEnd: null,
  blockLengthWeeks: 4
};

function addUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

function remove(list: string[], value: string): string[] {
  return list.filter((v) => v !== value);
}

function moveFamily(
  state: SkillPriority,
  familyId: string,
  target: 'primary' | 'secondary' | 'maintenance' | 'inactive'
): SkillPriority {
  const next: SkillPriority = {
    primarySkillFamilyId: state.primarySkillFamilyId,
    secondarySkillFamilyIds: remove(state.secondarySkillFamilyIds, familyId),
    maintenanceSkillFamilyIds: remove(state.maintenanceSkillFamilyIds, familyId),
    inactiveSkillFamilyIds: remove(state.inactiveSkillFamilyIds, familyId)
  } as SkillPriority;

  if (target === 'primary') {
    // Move previous primary to maintenance to preserve history.
    if (next.primarySkillFamilyId && next.primarySkillFamilyId !== familyId) {
      next.maintenanceSkillFamilyIds = addUnique(state.maintenanceSkillFamilyIds, next.primarySkillFamilyId);
    }
    next.primarySkillFamilyId = familyId;
  } else {
    if (next.primarySkillFamilyId === familyId) {
      next.primarySkillFamilyId = '';
    }
    if (target === 'secondary') {
      next.secondarySkillFamilyIds = addUnique(state.secondarySkillFamilyIds, familyId);
    } else if (target === 'maintenance') {
      next.maintenanceSkillFamilyIds = addUnique(state.maintenanceSkillFamilyIds, familyId);
    } else {
      next.inactiveSkillFamilyIds = addUnique(state.inactiveSkillFamilyIds, familyId);
    }
  }

  // Ensure consistency: secondary capped at two.
  next.secondarySkillFamilyIds = next.secondarySkillFamilyIds.slice(0, 2);

  // Keep other fields.
  next.goalTemplate = state.goalTemplate;
  next.blockStart = state.blockStart;
  next.blockEnd = state.blockEnd;
  next.blockLengthWeeks = state.blockLengthWeeks;

  return next;
}

export const useSkillPriorityStore = create<SkillPriorityState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PRIORITY,
      initialized: false,

      setPrimary: (familyId) => {
        set((state) => ({ ...moveFamily(state, familyId, 'primary'), initialized: true }));
      },

      toggleSecondary: (familyId) => {
        set((state) => {
          if (state.secondarySkillFamilyIds.includes(familyId)) {
            return { ...moveFamily(state, familyId, 'maintenance'), initialized: true };
          }
          if (state.secondarySkillFamilyIds.length >= 2) return state;
          return { ...moveFamily(state, familyId, 'secondary'), initialized: true };
        });
      },

      toggleMaintenance: (familyId) => {
        set((state) => {
          if (state.maintenanceSkillFamilyIds.includes(familyId)) {
            return { ...moveFamily(state, familyId, 'inactive'), initialized: true };
          }
          return { ...moveFamily(state, familyId, 'maintenance'), initialized: true };
        });
      },

      toggleInactive: (familyId) => {
        set((state) => {
          if (state.inactiveSkillFamilyIds.includes(familyId)) {
            return { ...moveFamily(state, familyId, 'maintenance'), initialized: true };
          }
          return { ...moveFamily(state, familyId, 'inactive'), initialized: true };
        });
      },

      setGoalTemplate: (template) => set({ goalTemplate: template }),

      startNewBlock: (lengthWeeks) => {
        const start = new Date();
        const end = new Date(start);
        end.setDate(start.getDate() + lengthWeeks * 7);
        set({
          blockStart: start.toISOString(),
          blockEnd: end.toISOString(),
          blockLengthWeeks: lengthWeeks
        });
      },

      rotatePrimary: () => {
        set((state) => {
          const [nextPrimary, ...remaining] = state.secondarySkillFamilyIds;
          if (!nextPrimary) return state;
          const movedToMaintenance = state.primarySkillFamilyId
            ? addUnique(state.maintenanceSkillFamilyIds, state.primarySkillFamilyId)
            : state.maintenanceSkillFamilyIds;
          return {
            ...state,
            primarySkillFamilyId: nextPrimary,
            secondarySkillFamilyIds: remaining,
            maintenanceSkillFamilyIds: movedToMaintenance
          };
        });
      },

      setPriority: (priority) => set((state) => ({ ...state, ...priority, initialized: true })),

      getStatusForFamily: (familyId) => {
        const state = get();
        if (state.primarySkillFamilyId === familyId) return 'active_primary';
        if (state.secondarySkillFamilyIds.includes(familyId)) return 'active_secondary';
        if (state.inactiveSkillFamilyIds.includes(familyId)) return 'inactive';
        return 'maintenance';
      }
    }),
    {
      name: 'gravitypath-skill-priority',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
