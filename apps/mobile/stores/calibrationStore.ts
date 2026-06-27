import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CalibrationProfile {
  name: string;
  unitSystem: 'metric' | 'imperial';
  primarySkillFamilyId: string;
}

export interface CalibrationState {
  profile: CalibrationProfile;
  exerciseLoads: Record<string, number>;
  skillStartingNodesByFamily: Record<string, string>;
  completed: boolean;
  // actions
  setProfile: (profile: Partial<CalibrationProfile>) => void;
  setExerciseLoad: (exerciseId: string, loadKg: number) => void;
  setSkillStartingNodeByFamily: (familyId: string, nodeId: string) => void;
  completeCalibration: () => void;
  getCalibrationLoad: (exerciseId: string) => number | undefined;
}

const DEFAULT_LOADS_KG: Record<string, number> = {
  'pull-up': 0,
  'back-squat': 60,
  'bench-press': 50,
  'trap-bar-deadlift': 80,
  'overhead-press': 30,
  'front-squat': 50,
  'low-incline-press': 50,
  'romanian-deadlift': 60,
  'weighted-pull-up': 5
};

export const useCalibrationStore = create<CalibrationState>()(
  persist(
    (set, get) => ({
      profile: {
        name: '',
        unitSystem: 'metric',
        primarySkillFamilyId: ''
      },
      exerciseLoads: {},
      skillStartingNodesByFamily: {},
      completed: false,

      setProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile }
        }));
      },

      setExerciseLoad: (exerciseId, loadKg) => {
        set((state) => ({
          exerciseLoads: { ...state.exerciseLoads, [exerciseId]: loadKg }
        }));
      },

      setSkillStartingNodeByFamily: (familyId, nodeId) => {
        set((state) => ({
          skillStartingNodesByFamily: { ...state.skillStartingNodesByFamily, [familyId]: nodeId }
        }));
      },

      completeCalibration: () => {
        set({ completed: true });
      },

      getCalibrationLoad: (exerciseId) => {
        const state = get();
        if (state.exerciseLoads[exerciseId] !== undefined) {
          return state.exerciseLoads[exerciseId];
        }
        return DEFAULT_LOADS_KG[exerciseId];
      }
    }),
    {
      name: 'gravitypath-calibration',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
