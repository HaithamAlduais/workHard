import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useScheduleStore,
  getNextDateForDays,
  applyPreferredTime,
  type ScheduleState
} from '../../../apps/mobile/stores/scheduleStore';

function stubStorage() {
  vi.stubGlobal('window', {
    localStorage: {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    }
  });
}

function resetStore(overrides: Partial<ScheduleState> = {}) {
  useScheduleStore.setState({
    trainingDays: [1, 3, 5],
    preferredTimeMinutes: 480,
    lastCompletedDayIndex: -1,
    nextScheduledDate: applyPreferredTime(
      getNextDateForDays(new Date('2026-06-26T12:00:00'), [1, 3, 5]),
      480
    ).toISOString(),
    missedWorkouts: [],
    lastCompletedWorkoutId: undefined,
    ...overrides
  });
}

describe('schedule store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00'));
    stubStorage();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('detectMissedWorkouts', () => {
    it('records a missed workout and reschedules the same day on the next valid training date', () => {
      const pastScheduled = applyPreferredTime(new Date('2026-06-24T08:00:00'), 480);
      resetStore({ nextScheduledDate: pastScheduled.toISOString() });

      useScheduleStore.getState().detectMissedWorkouts([]);

      const state = useScheduleStore.getState();
      expect(state.missedWorkouts).toHaveLength(1);
      expect(state.missedWorkouts[0].dayId).toBe('day1');
      expect(state.missedWorkouts[0].scheduledDate).toBe(pastScheduled.toISOString());

      const expectedNext = applyPreferredTime(
        getNextDateForDays(new Date('2026-06-26T12:00:00'), [1, 3, 5]),
        480
      );
      expect(state.nextScheduledDate).toBe(expectedNext.toISOString());
    });

    it('does not record a duplicate missed workout for the same scheduled date', () => {
      const pastScheduled = applyPreferredTime(new Date('2026-06-24T08:00:00'), 480);
      resetStore({ nextScheduledDate: pastScheduled.toISOString() });

      useScheduleStore.getState().detectMissedWorkouts([]);
      useScheduleStore.getState().detectMissedWorkouts([]);

      expect(useScheduleStore.getState().missedWorkouts).toHaveLength(1);
    });

    it('does not record a missed workout when a completion exists on or after the scheduled date', () => {
      const pastScheduled = applyPreferredTime(new Date('2026-06-24T08:00:00'), 480);
      resetStore({ nextScheduledDate: pastScheduled.toISOString() });

      useScheduleStore.getState().detectMissedWorkouts([
        { id: 'w1', programDayId: 'day1', completedAt: '2026-06-25T10:00:00' }
      ]);

      expect(useScheduleStore.getState().missedWorkouts).toHaveLength(0);
    });

    it('preserves Day 1 → Day 2 → Day 3 order by not advancing the day index', () => {
      const pastScheduled = applyPreferredTime(new Date('2026-06-24T08:00:00'), 480);
      resetStore({ nextScheduledDate: pastScheduled.toISOString() });

      useScheduleStore.getState().detectMissedWorkouts([]);

      expect(useScheduleStore.getState().getNextDayId()).toBe('day1');
    });
  });

  describe('advanceAfterCompletion', () => {
    it('advances to the next training day and records the completed workout id', () => {
      useScheduleStore.getState().advanceAfterCompletion('workout-1', 'day1');

      const state = useScheduleStore.getState();
      expect(state.lastCompletedWorkoutId).toBe('workout-1');
      expect(state.lastCompletedDayIndex).toBe(0);
      expect(state.getNextDayId()).toBe('day2');
    });

    it('prevents double advancement using lastCompletedWorkoutId', () => {
      useScheduleStore.getState().advanceAfterCompletion('workout-1', 'day1');
      const afterFirst = useScheduleStore.getState().nextScheduledDate;

      useScheduleStore.getState().advanceAfterCompletion('workout-1', 'day1');
      const state = useScheduleStore.getState();

      expect(state.lastCompletedWorkoutId).toBe('workout-1');
      expect(state.lastCompletedDayIndex).toBe(0);
      expect(state.nextScheduledDate).toBe(afterFirst);
    });
  });

  describe('setTrainingDays', () => {
    it('accepts exactly three unique days in [0,6]', () => {
      useScheduleStore.getState().setTrainingDays([2, 4, 6]);
      expect(useScheduleStore.getState().trainingDays).toEqual([2, 4, 6]);
    });

    it('rejects fewer than three days', () => {
      expect(() => useScheduleStore.getState().setTrainingDays([1, 3])).toThrow();
    });

    it('rejects more than three days', () => {
      expect(() => useScheduleStore.getState().setTrainingDays([0, 1, 2, 3])).toThrow();
    });

    it('rejects days outside [0,6]', () => {
      expect(() => useScheduleStore.getState().setTrainingDays([0, 1, 7])).toThrow();
    });

    it('rejects duplicates that do not produce three unique days', () => {
      expect(() => useScheduleStore.getState().setTrainingDays([1, 1, 2])).toThrow();
    });
  });

  describe('preferredTimeMinutes', () => {
    it('applies preferred time when setting training days', () => {
      useScheduleStore.setState({ preferredTimeMinutes: 600 });
      useScheduleStore.getState().setTrainingDays([1, 3, 5]);

      const scheduled = new Date(useScheduleStore.getState().nextScheduledDate);
      expect(scheduled.getHours()).toBe(10);
      expect(scheduled.getMinutes()).toBe(0);
    });

    it('applies preferred time when advancing after completion', () => {
      useScheduleStore.setState({ preferredTimeMinutes: 930 });
      useScheduleStore.getState().advanceAfterCompletion('workout-1', 'day1');

      const scheduled = new Date(useScheduleStore.getState().nextScheduledDate);
      expect(scheduled.getHours()).toBe(15);
      expect(scheduled.getMinutes()).toBe(30);
    });

    it('applies preferred time when rescheduling a missed workout', () => {
      const pastScheduled = applyPreferredTime(new Date('2026-06-24T08:00:00'), 480);
      resetStore({ nextScheduledDate: pastScheduled.toISOString(), preferredTimeMinutes: 720 });

      useScheduleStore.getState().detectMissedWorkouts([]);

      const scheduled = new Date(useScheduleStore.getState().nextScheduledDate);
      expect(scheduled.getHours()).toBe(12);
      expect(scheduled.getMinutes()).toBe(0);
    });
  });
});
