import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateProjection,
  projectionExerciseIds,
  projectionSkillFamilyIds,
  nodeIdToProjectedLevel,
  getProjectionExerciseConfig,
  exportProjectionToCSV,
  exportProjectionToJSON,
  type ProjectionSettings,
  type ProjectionInput,
  type ProjectionResult,
  type ProjectionSpeed,
  type UnitSystem
} from '@gravitypath/domain';
import type { CalibrationState } from './calibrationStore';

export interface ProjectionStoreState {
  settings: ProjectionSettings;
  gymInputs: Record<string, number>;
  skillLevels: Record<string, number>;
  projection: ProjectionResult | null;
  generatedAt: string | null;
  currentWeek: number;
  // actions
  setSetting: <K extends keyof ProjectionSettings>(key: K, value: ProjectionSettings[K]) => void;
  setGymInput: (exerciseId: string, loadKg: number) => void;
  setSkillLevel: (familyId: string, level: number) => void;
  generateProjection: (priorities?: ProjectionInput['skillPriorities'], bodyweightKg?: number) => void;
  setCurrentWeek: (week: number) => void;
  resetProjection: () => void;
  exportCSV: () => string;
  exportJSON: () => string;
}

const DEFAULT_SETTINGS: ProjectionSettings = {
  durationWeeks: 12,
  deloadFrequency: 4,
  speed: 'moderate',
  upperBodyIncrementKg: 2.5,
  lowerBodyIncrementKg: 5,
  dumbbellIncrementKg: 2.5,
  machineIncrementKg: 2.5,
  unitSystem: 'metric'
};

function buildInitialGymInputs(calibration?: CalibrationState): Record<string, number> {
  const inputs: Record<string, number> = {};
  if (!calibration) return inputs;
  for (const id of projectionExerciseIds()) {
    const load = calibration.getCalibrationLoad(id);
    if (load !== undefined && load > 0) {
      inputs[id] = load;
    }
  }
  return inputs;
}

function buildInitialSkillLevels(calibration?: CalibrationState): Record<string, number> {
  const levels: Record<string, number> = {};
  if (!calibration) return levels;
  for (const familyId of projectionSkillFamilyIds()) {
    const nodeId = calibration.skillStartingNodesByFamily[familyId === 'hspu' ? 'handstand' : familyId];
    if (nodeId) {
      levels[familyId] = nodeIdToProjectedLevel(familyId, nodeId);
    } else {
      levels[familyId] = 0;
    }
  }
  return levels;
}

export const useProjectionStore = create<ProjectionStoreState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      gymInputs: {},
      skillLevels: {},
      projection: null,
      generatedAt: null,
      currentWeek: 1,

      setSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }));
      },

      setGymInput: (exerciseId, loadKg) => {
        set((state) => ({
          gymInputs: { ...state.gymInputs, [exerciseId]: loadKg }
        }));
      },

      setSkillLevel: (familyId, level) => {
        set((state) => ({
          skillLevels: { ...state.skillLevels, [familyId]: Math.min(5, Math.max(0, level)) }
        }));
      },

      generateProjection: (priorities, bodyweightKg) => {
        const state = get();
        const gymInputs = Object.entries(state.gymInputs)
          .filter(([, load]) => load > 0)
          .map(([exerciseId, loadKg]) => ({ exerciseId, loadKg }));
        const skillLevels = Object.entries(state.skillLevels).map(([familyId, level]) => ({ familyId, level }));

        const input: ProjectionInput = {
          settings: state.settings,
          gymInputs,
          skillLevels,
          skillPriorities: priorities,
          bodyweightKg
        };

        const projection = generateProjection(input);
        set({
          projection,
          generatedAt: new Date().toISOString(),
          currentWeek: 1
        });
      },

      setCurrentWeek: (week) => {
        const state = get();
        const total = state.projection?.settings.durationWeeks ?? 1;
        set({ currentWeek: Math.min(total, Math.max(1, week)) });
      },

      resetProjection: () => {
        set({
          settings: { ...DEFAULT_SETTINGS },
          gymInputs: {},
          skillLevels: {},
          projection: null,
          generatedAt: null,
          currentWeek: 1
        });
      },

      exportCSV: () => {
        const result = get().projection;
        return result ? exportProjectionToCSV(result) : '';
      },

      exportJSON: () => {
        const result = get().projection;
        return result ? exportProjectionToJSON(result) : '';
      }
    }),
    {
      name: 'gravitypath-projection',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

export function initializeProjectionFromCalibration(calibration?: CalibrationState) {
  useProjectionStore.setState({
    gymInputs: buildInitialGymInputs(calibration),
    skillLevels: buildInitialSkillLevels(calibration)
  });
}
