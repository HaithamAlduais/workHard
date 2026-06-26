import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { allProgramDayIds } from '@gravitypath/domain';

export interface ScheduleState {
  trainingDays: number[];
  preferredTimeMinutes: number;
  lastCompletedDayIndex: number;
  nextScheduledDate: string;
  missedWorkouts: string[];
  setTrainingDays: (days: number[]) => void;
  setPreferredTime: (minutes: number) => void;
  markDayCompleted: (dayId: string) => void;
  rescheduleMissed: () => void;
  getNextDayId: () => string;
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
      nextScheduledDate: getNextDateForDays(new Date(), [1, 3, 5]).toISOString(),
      missedWorkouts: [],

      setTrainingDays: (days) => {
        const next = getNextDateForDays(new Date(), days);
        set({ trainingDays: days, nextScheduledDate: next.toISOString() });
      },

      setPreferredTime: (minutes) => set({ preferredTimeMinutes: minutes }),

      markDayCompleted: (dayId) => {
        const ids = allProgramDayIds();
        const idx = ids.indexOf(dayId);
        const nextIdx = (idx + 1) % ids.length;
        const startFromTomorrow = new Date();
        startFromTomorrow.setDate(startFromTomorrow.getDate() + 1);
        const nextDate = getNextDateForDays(startFromTomorrow, get().trainingDays);
        set({ lastCompletedDayIndex: idx, nextScheduledDate: nextDate.toISOString() });
      },

      rescheduleMissed: () => {
        const { trainingDays, lastCompletedDayIndex } = get();
        const ids = allProgramDayIds();
        const nextIdx = (lastCompletedDayIndex + 1) % ids.length;
        const nextDate = getNextDateForDays(new Date(), trainingDays);
        set({ nextScheduledDate: nextDate.toISOString(), missedWorkouts: [] });
      },

      getNextDayId: () => {
        const ids = allProgramDayIds();
        return dayIdFromIndex((get().lastCompletedDayIndex + 1) % ids.length);
      }
    }),
    {
      name: 'gravitypath-schedule',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
