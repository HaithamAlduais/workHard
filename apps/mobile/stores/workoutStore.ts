import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveWorkoutState, LoggedSet, WorkoutBlock, WorkoutExercise, NextSetResult } from '@gravitypath/domain';
import { advanceAfterSet, currentExercise, currentBlock, startWorkoutState } from '@gravitypath/domain';

export type { ActiveWorkoutState, LoggedSet };

export interface ProgressionDecision {
  exerciseId: string;
  decisionType: string;
  newTarget?: { loadKg?: number; repsMin?: number; repsMax?: number; holdSeconds?: number };
  targetNodeId?: string;
  reason: string;
  decidedAt: string;
}

interface WorkoutState {
  activeWorkout: ActiveWorkoutState | null;
  completedWorkouts: ActiveWorkoutState[];
  sets: LoggedSet[];
  pendingSets: LoggedSet[];
  progressionDecisions: ProgressionDecision[];
  isOffline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt?: string;
  // actions
  startWorkout: (dayId: string) => void;
  resumeWorkout: () => void;
  completeSet: (set: LoggedSet) => NextSetResult;
  skipSet: () => void;
  stopForPain: () => void;
  finishWorkout: () => void;
  tick: () => void;
  setOffline: (offline: boolean) => void;
  markSynced: (ids: string[]) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  addProgressionDecision: (decision: ProgressionDecision) => void;
  resetStore: () => void;
}

export function getCompletedSetsForExercise(
  state: WorkoutState,
  exerciseId: string,
  sessionId: string
): LoggedSet[] {
  return state.sets.filter(
    (s) => s.exerciseId === exerciseId && s.workoutSessionId === sessionId && s.status === 'completed'
  );
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      completedWorkouts: [],
      sets: [],
      pendingSets: [],
      progressionDecisions: [],
      isOffline: false,
      syncStatus: 'idle',

      startWorkout: (dayId) => {
        const workout = startWorkoutState(dayId);
        set({ activeWorkout: workout });
      },

      resumeWorkout: () => {
        // activeWorkout is already persisted; this is a no-op trigger for UI
      },

      completeSet: (loggedSet) => {
        const { activeWorkout } = get();
        if (!activeWorkout) {
          return { blockCompleted: false, nextBlockIndex: 0, nextExerciseIndex: 0, restSeconds: 0 };
        }
        const sessionId = activeWorkout.id;
        const result = advanceAfterSet(activeWorkout, loggedSet, (exerciseId) =>
          getCompletedSetsForExercise(get(), exerciseId, sessionId)
        );

        const updatedBlocks = activeWorkout.blocks.map((block, idx) => {
          if (idx !== result.nextBlockIndex) return block;
          return {
            ...block,
            currentExerciseIndex: result.nextExerciseIndex,
            completed: result.blockCompleted
          };
        });

        set((state) => ({
          activeWorkout: {
            ...activeWorkout,
            blocks: updatedBlocks,
            currentBlockIndex: result.nextBlockIndex
          },
          sets: [...state.sets, loggedSet],
          pendingSets: [...state.pendingSets, loggedSet]
        }));

        return result;
      },

      skipSet: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        const ex = currentExercise(activeWorkout);
        if (!ex) return;
        const sessionId = activeWorkout.id;
        const skipped: LoggedSet = {
          id: `set-${Date.now()}`,
          blockId: currentBlock(activeWorkout)?.id ?? '',
          exerciseId: ex.id,
          workoutSessionId: sessionId,
          setNumber: getCompletedSetsForExercise(get(), ex.id, sessionId).length + 1,
          loadKg: 0,
          reps: 0,
          rir: 0,
          holdSeconds: 0,
          rom: 'full',
          form: 'acceptable',
          painLevel: 0,
          restSeconds: 0,
          completedAt: new Date().toISOString(),
          pendingSync: true,
          status: 'skipped'
        };
        get().completeSet(skipped);
      },

      stopForPain: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        const ex = currentExercise(activeWorkout);
        if (!ex) return;
        const sessionId = activeWorkout.id;
        const stopped: LoggedSet = {
          id: `set-${Date.now()}`,
          blockId: currentBlock(activeWorkout)?.id ?? '',
          exerciseId: ex.id,
          workoutSessionId: sessionId,
          setNumber: getCompletedSetsForExercise(get(), ex.id, sessionId).length + 1,
          loadKg: 0,
          reps: 0,
          rir: 0,
          holdSeconds: 0,
          rom: 'full',
          form: 'acceptable',
          painLevel: 2,
          restSeconds: 0,
          completedAt: new Date().toISOString(),
          pendingSync: true,
          status: 'stopped_pain'
        };
        get().completeSet(stopped);
        // Advance out of this exercise
        set((state) => {
          const aw = state.activeWorkout;
          if (!aw) return state;
          const block = currentBlock(aw);
          if (!block) return state;
          const nextExIndex = Math.min(block.currentExerciseIndex + 1, block.exercises.length - 1);
          const nextBlockIndex = nextExIndex === block.currentExerciseIndex ? Math.min(aw.currentBlockIndex + 1, aw.blocks.length - 1) : aw.currentBlockIndex;
          return {
            activeWorkout: {
              ...aw,
              currentBlockIndex: nextBlockIndex,
              blocks: aw.blocks.map((b, idx) =>
                idx === aw.currentBlockIndex ? { ...b, currentExerciseIndex: nextExIndex } : b
              )
            }
          };
        });
      },

      finishWorkout: () => {
        const { activeWorkout } = get();
        if (!activeWorkout || activeWorkout.status === 'completed') return;
        const finished: ActiveWorkoutState = {
          ...activeWorkout,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        set((state) => ({
          activeWorkout: finished,
          completedWorkouts: [...state.completedWorkouts, finished]
        }));
      },

      tick: () => {
        const { activeWorkout } = get();
        if (!activeWorkout || activeWorkout.status !== 'active') return;
        set({ activeWorkout: { ...activeWorkout, elapsedSeconds: activeWorkout.elapsedSeconds + 1 } });
      },

      setOffline: (offline) => set({ isOffline: offline }),
      setSyncStatus: (status) => set({ syncStatus: status }),

      markSynced: (ids) => {
        set((state) => ({
          pendingSets: state.pendingSets.filter((s) => !ids.includes(s.id)),
          sets: state.sets.map((s) => (ids.includes(s.id) ? { ...s, pendingSync: false } : s)),
          lastSyncAt: new Date().toISOString(),
          syncStatus: 'idle'
        }));
      },

      addProgressionDecision: (decision) => {
        set((state) => ({
          progressionDecisions: [...state.progressionDecisions.filter((d) => d.exerciseId !== decision.exerciseId), decision]
        }));
      },

      resetStore: () => {
        set({
          activeWorkout: null,
          completedWorkouts: [],
          sets: [],
          pendingSets: [],
          progressionDecisions: [],
          isOffline: false,
          syncStatus: 'idle'
        });
      }
    }),
    {
      name: 'gravitypath-workout-v2',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
