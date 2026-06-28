import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GraduationContract, GraduationRequirement, GraduationTemplate } from '@gravitypath/domain';

export interface GraduationState {
  selectedTemplate: GraduationTemplate | null;
  customRequirements: GraduationRequirement[];
  contract: GraduationContract | null;
  homeIndependenceMode: boolean;
  transitionWeek: number;
  completedTemplates: GraduationTemplate[];
  // actions
  selectTemplate: (template: GraduationTemplate) => void;
  setContract: (contract: GraduationContract | null) => void;
  setCustomRequirements: (requirements: GraduationRequirement[]) => void;
  startTransition: () => void;
  advanceTransitionWeek: () => void;
  activateHomeIndependence: () => void;
  markTemplateCompleted: (template: GraduationTemplate) => void;
  resetGraduation: () => void;
}

export const useGraduationStore = create<GraduationState>()(
  persist(
    (set, get) => ({
      selectedTemplate: null,
      customRequirements: [],
      contract: null,
      homeIndependenceMode: false,
      transitionWeek: 0,
      completedTemplates: [],

      selectTemplate: (template) => {
        set({ selectedTemplate: template });
      },

      setContract: (contract) => {
        set({ contract });
      },

      setCustomRequirements: (requirements) => {
        set({ customRequirements: requirements });
      },

      startTransition: () => {
        set({ transitionWeek: 1 });
      },

      advanceTransitionWeek: () => {
        const next = get().transitionWeek + 1;
        set({ transitionWeek: next > 4 ? 4 : next });
      },

      activateHomeIndependence: () => {
        const completed = new Set(get().completedTemplates);
        completed.add('PRACTICAL_HOME_INDEPENDENCE');
        set({ homeIndependenceMode: true, transitionWeek: 4, completedTemplates: Array.from(completed) });
      },

      markTemplateCompleted: (template) => {
        const completed = new Set(get().completedTemplates);
        completed.add(template);
        set({ completedTemplates: Array.from(completed) });
      },

      resetGraduation: () => {
        set({
          selectedTemplate: null,
          customRequirements: [],
          contract: null,
          homeIndependenceMode: false,
          transitionWeek: 0,
          completedTemplates: []
        });
      }
    }),
    {
      name: 'gravitypath-graduation',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
