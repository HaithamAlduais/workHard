import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { allProgramDayIds } from '@gravitypath/domain';

export interface MissedWorkout {
  dayId: string;
  scheduledDate: string;
  detectedAt: string;
}

export interface ScheduleState {
  trainingDays: number[];
  preferredTimeMinutes: number;
  lastCompletedDayIndex: number;
  nextScheduledDate: string;
  missedWorkouts: MissedWorkout[];
  lastCompletedWorkoutId?: string;
  setTrainingDays: (days: number[]) => void;
  setPreferredTime: (minutes: number) => void;
  markDayCompleted: (dayId: string) => void;
  rescheduleMissed: () => void;
  getNextDayId: () => string;
  detectMissedWorkouts: (completedWorkouts: { id: string; programDayId: string; completedAt?: string }[]) => void;
  advanceAfterCompletion: (workoutId: string, dayId: string) => void;
}

export function applyPreferredTime(date: Date, minutes: number): Date {
  const adjusted = new Date(date);
  adjusted.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return adjusted;
}

export function getNextDateForDays(start: Date, days: number[]): Date {
  const result = new Date(start);
  for (let i = 0; i <= 14; i++) {
    const candidate = new Date(result);
    candidate.setDate(result.getDate() + i);
    if (days.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return result;
}

export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function validateTrainingDays(days: number[]): number[] {
  if (!Array.isArray(days)) {
    throw new Error('Training days must be an array');
  }
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length !== 3) {
    throw new Error('Training days must contain exactly three unique days');
  }
  if (unique.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new Error('Training days must be integers in the range [0,6]');
  }
  return unique;
}

export function dayIdFromIndex(index: number): string {
  const ids = allProgramDayIds();
  return ids[index % ids.length];
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      trainingDays: [1, 3, 5],
      preferredTimeMinutes: 480,
      lastCompletedDayIndex: -1,
      nextScheduledDate: applyPreferredTime(
        getNextDateForDays(new Date(), [1, 3, 5]),
        480
      ).toISOString(),
      missedWorkouts: [],
      lastCompletedWorkoutId: undefined,

      setTrainingDays: (days) => {
        const validDays = validateTrainingDays(days);
        const next = applyPreferredTime(
          getNextDateForDays(new Date(), validDays),
          get().preferredTimeMinutes
        );
        set({ trainingDays: validDays, nextScheduledDate: next.toISOString() });
      },

      setPreferredTime: (minutes) => set({ preferredTimeMinutes: minutes }),

      markDayCompleted: (dayId) => {
        const ids = allProgramDayIds();
        const idx = ids.indexOf(dayId);
        const startFromTomorrow = new Date();
        startFromTomorrow.setDate(startFromTomorrow.getDate() + 1);
        const nextDate = applyPreferredTime(
          getNextDateForDays(startFromTomorrow, get().trainingDays),
          get().preferredTimeMinutes
        );
        set({ lastCompletedDayIndex: idx, nextScheduledDate: nextDate.toISOString() });
      },

      rescheduleMissed: () => {
        const { trainingDays, preferredTimeMinutes } = get();
        const nextDate = applyPreferredTime(
          getNextDateForDays(new Date(), trainingDays),
          preferredTimeMinutes
        );
        set({ nextScheduledDate: nextDate.toISOString(), missedWorkouts: [] });
      },

      getNextDayId: () => {
        return dayIdFromIndex((get().lastCompletedDayIndex + 1));
      },

      detectMissedWorkouts: (completedWorkouts) => {
        const state = get();
        const scheduled = new Date(state.nextScheduledDate);
        const now = new Date();
        const startOfToday = getStartOfDay(now);

        if (scheduled.getTime() >= startOfToday.getTime()) {
          return;
        }

        const wasCompleted = completedWorkouts.some((w) => {
          if (!w.completedAt) return false;
          return new Date(w.completedAt).getTime() >= scheduled.getTime();
        });

        if (wasCompleted) {
          return;
        }

        const alreadyRecorded = state.missedWorkouts.some(
          (m) => m.scheduledDate === state.nextScheduledDate
        );

        if (alreadyRecorded) {
          return;
        }

        const missed: MissedWorkout = {
          dayId: get().getNextDayId(),
          scheduledDate: state.nextScheduledDate,
          detectedAt: now.toISOString()
        };

        const nextDate = applyPreferredTime(
          getNextDateForDays(new Date(), state.trainingDays),
          state.preferredTimeMinutes
        );

        set({
          missedWorkouts: [...state.missedWorkouts, missed],
          nextScheduledDate: nextDate.toISOString()
        });
      },

      advanceAfterCompletion: (workoutId, dayId) => {
        if (get().lastCompletedWorkoutId === workoutId) {
          return;
        }
        set({ lastCompletedWorkoutId: workoutId });
        get().markDayCompleted(dayId);
      }
    }),
    {
      name: 'gravitypath-schedule',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
