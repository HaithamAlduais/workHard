import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  loadKg: number;
  reps: number;
  rir: number;
  holdSeconds?: number;
  painLevel: number;
  restSeconds: number;
  completedAt?: string;
  pendingSync: boolean;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  name: string;
  orderClass: string;
  pairId?: string;
  pairType?: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetLoadKg?: number;
  targetHoldSeconds?: number;
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  programDayId: string;
  dayName: string;
  startedAt: string;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  elapsedSeconds: number;
  status: 'idle' | 'active' | 'completed';
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  pendingSets: WorkoutSet[];
  isOffline: boolean;
  startWorkout: (workout: ActiveWorkout) => void;
  completeSet: (exerciseId: string, set: WorkoutSet) => void;
  nextExercise: () => void;
  tick: () => void;
  finishWorkout: () => void;
  setOffline: (offline: boolean) => void;
  markSynced: (ids: string[]) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      pendingSets: [],
      isOffline: false,
      startWorkout: (workout) => set({ activeWorkout: workout }),
      completeSet: (exerciseId, newSet) => {
        const { activeWorkout, pendingSets } = get();
        if (!activeWorkout) return;
        const exercises = activeWorkout.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const existing = ex.sets.find((s) => s.id === newSet.id);
          const sets = existing ? ex.sets.map((s) => (s.id === newSet.id ? newSet : s)) : [...ex.sets, newSet];
          return { ...ex, sets };
        });
        set({
          activeWorkout: { ...activeWorkout, exercises },
          pendingSets: [...pendingSets, newSet]
        });
      },
      nextExercise: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        const next = Math.min(activeWorkout.currentExerciseIndex + 1, activeWorkout.exercises.length - 1);
        set({ activeWorkout: { ...activeWorkout, currentExerciseIndex: next } });
      },
      tick: () => {
        const { activeWorkout } = get();
        if (!activeWorkout || activeWorkout.status !== 'active') return;
        set({ activeWorkout: { ...activeWorkout, elapsedSeconds: activeWorkout.elapsedSeconds + 1 } });
      },
      finishWorkout: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({ activeWorkout: { ...activeWorkout, status: 'completed' } });
      },
      setOffline: (offline) => set({ isOffline: offline }),
      markSynced: (ids) => {
        set((state) => ({
          pendingSets: state.pendingSets.filter((s) => !ids.includes(s.id))
        }));
      }
    }),
    {
      name: 'gravitypath-workout',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
