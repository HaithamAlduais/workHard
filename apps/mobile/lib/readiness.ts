import {
  evaluateMovementPatternReadiness,
  getHomeReadinessPercent,
  getTopBlockers,
  getExerciseById,
  classifySetVolume,
  aggregateVolume,
  type ActiveWorkoutState,
  type LoggedSet,
  type MovementPatternReadiness,
  type SkillAttempt,
  type VolumeEntry,
  type ReadinessInput
} from '@gravitypath/domain';
import { useEquipmentStore } from '../stores/equipmentStore';
import { useSkillStore } from '../stores/skillStore';
import { useWorkoutStore } from '../stores/workoutStore';

const VOLUME_DAYS = 7;

function isWithinDays(dateIso: string | undefined, days: number): boolean {
  if (!dateIso) return false;
  const then = new Date(dateIso).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return then >= cutoff;
}

function mapSpecIdToExerciseId(workout: ActiveWorkoutState, specId: string): string | undefined {
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      if (ex.id === specId) return ex.exerciseId;
    }
  }
  return undefined;
}

export function aggregateWeeklyVolume(
  completedWorkouts: ActiveWorkoutState[],
  sets: LoggedSet[]
): Record<string, VolumeEntry> {
  const entries: Partial<VolumeEntry>[] = [];

  for (const workout of completedWorkouts) {
    if (workout.status !== 'completed' || !isWithinDays(workout.completedAt, VOLUME_DAYS)) continue;

    const workoutSets = sets.filter((s) => s.workoutSessionId === workout.id && s.status === 'completed');
    for (const set of workoutSets) {
      if (set.painLevel >= 2 || set.form === 'poor' || set.rom !== 'full') continue;

      const exerciseId = mapSpecIdToExerciseId(workout, set.exerciseId);
      if (!exerciseId) continue;
      const exercise = getExerciseById(exerciseId);
      if (!exercise) continue;

      entries.push(
        classifySetVolume(exercise, set as any, 'primary')
      );
    }
  }

  const aggregated = aggregateVolume(entries);
  const result: Record<string, VolumeEntry> = {};
  for (const entry of aggregated) {
    result[entry.muscleId] = entry;
  }
  return result;
}

export function getPainFlaggedExerciseIds(
  completedWorkouts: ActiveWorkoutState[],
  sets: LoggedSet[]
): string[] {
  const flagged = new Set<string>();
  for (const workout of completedWorkouts) {
    const workoutSets = sets.filter((s) => s.workoutSessionId === workout.id);
    for (const set of workoutSets) {
      if (set.painLevel > 0) {
        const exerciseId = mapSpecIdToExerciseId(workout, set.exerciseId);
        if (exerciseId) flagged.add(exerciseId);
      }
    }
  }
  return Array.from(flagged);
}

export interface HomeReadinessResult {
  readiness: Map<string, MovementPatternReadiness>;
  percent: number;
  topBlockers: string[];
}

export function buildHomeReadiness(
  completedWorkouts: ActiveWorkoutState[],
  sets: LoggedSet[],
  skillAttempts: SkillAttempt[],
  sessionTimeMinutes = 60
): HomeReadinessResult {
  const equipmentOwned = useEquipmentStore.getState().getOwnedList();
  const unlockStates = useSkillStore.getState().getUnlockStates();
  const weeklyVolumeByMuscle = aggregateWeeklyVolume(completedWorkouts, sets);
  const painFlaggedExerciseIds = getPainFlaggedExerciseIds(completedWorkouts, sets);

  const input: ReadinessInput = {
    equipmentOwned,
    unlockStates,
    skillAttempts,
    weeklyVolumeByMuscle,
    painFlaggedExerciseIds,
    sessionTimeMinutes
  };

  const readiness = evaluateMovementPatternReadiness(input);
  return {
    readiness,
    percent: getHomeReadinessPercent(readiness),
    topBlockers: getTopBlockers(readiness, 3)
  };
}

export function useHomeReadiness(sessionTimeMinutes = 60): HomeReadinessResult {
  const { completedWorkouts, sets } = useWorkoutStore();
  const { attempts } = useSkillStore();
  const domainAttempts: SkillAttempt[] = attempts.map((a) => ({
    ...a,
    completedAt: new Date(a.completedAt),
    userId: 'local',
    painLevel: a.painLevel as 0 | 1 | 2 | 3,
    selfReported: !a.videoVerified && !a.coachVerified
  }));
  return buildHomeReadiness(completedWorkouts, sets, domainAttempts, sessionTimeMinutes);
}
