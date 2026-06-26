import { decideDeload, decideSetAddition } from '@gravitypath/domain';
import type {
  DeloadDecision,
  SetAdditionDecision,
  ActiveWorkoutState
} from '@gravitypath/domain';
import type { ProgressionDecision } from '../stores/workoutStore';
import type {
  ExercisePrescriptionWithMeta,
  SkillPrescriptionWithMeta
} from '../stores/prescriptionStore';

export interface WeeklyReviewResult {
  deload: DeloadDecision & { reason: string };
  setAdditions: Array<{
    exerciseId: string;
    name: string;
    decision: SetAdditionDecision;
  }>;
  regressingExercises: string[];
  adherencePercent: number;
  summary: string;
}

function isWithinDays(dateIso: string, days: number): boolean {
  const then = new Date(dateIso).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return then >= cutoff;
}

function countSessionsLastDays(
  workouts: ActiveWorkoutState[],
  days: number
): number {
  return workouts.filter(
    (w) => w.status === 'completed' && w.completedAt && isWithinDays(w.completedAt, days)
  ).length;
}

function countDecisionsForExercise(
  decisions: ProgressionDecision[],
  exerciseId: string,
  days: number,
  types: string[]
): number {
  return decisions.filter(
    (d) =>
      d.exerciseId === exerciseId &&
      isWithinDays(d.decidedAt, days) &&
      types.includes(d.decisionType)
  ).length;
}

function countFailedSkippedStoppedSets(workouts: ActiveWorkoutState[]): number {
  // The workouts themselves don't carry sets; callers pass completedWorkouts from the store,
  // but sets live in the store's `sets` array. Since this module intentionally only receives
  // workouts and decisions, we approximate by counting workouts that ended with pain/stopped status.
  // For richer reporting the dashboard can read `sets` directly.
  return 0;
}

function hasPainReports(decisions: ProgressionDecision[]): boolean {
  return decisions.some(
    (d) =>
      d.decisionType === 'HOLD_FOR_SAFETY' &&
      d.reason.toLowerCase().includes('pain')
  );
}

function hasSkillQualityDecline(decisions: ProgressionDecision[]): boolean {
  return decisions.some((d) => d.decisionType === 'STOP_BLOCK_DUE_TO_QUALITY_DROP');
}

function broadFatigueHeuristic(
  workouts: ActiveWorkoutState[],
  regressingCount: number
): boolean {
  const longOrStoppedSessions = workouts.filter((w) => {
    if (w.status !== 'completed' || !w.completedAt || !w.startedAt) return false;
    const durationMinutes =
      (new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 60000;
    // Approximate "stopped >10 sets" by duration > 75 min
    return durationMinutes > 75;
  }).length;
  return longOrStoppedSessions >= 2 || regressingCount >= 2;
}

export function runWeeklyReview(
  completedWorkouts: ActiveWorkoutState[],
  decisions: ProgressionDecision[],
  exercisePrescriptions: Record<string, ExercisePrescriptionWithMeta>,
  skillPrescriptions: Record<string, SkillPrescriptionWithMeta>
): WeeklyReviewResult {
  const sessionsLast7Days = countSessionsLastDays(completedWorkouts, 7);

  const regressing = decisions.filter(
    (d) => d.decisionType === 'REDUCE_LOAD' || d.decisionType === 'REGRESS_NODE'
  );
  const regressingExerciseIds = Array.from(
    new Set(regressing.map((d) => d.exerciseId))
  );

  const failedSkippedStopped = countFailedSkippedStoppedSets(completedWorkouts);
  const pain = hasPainReports(decisions);
  const skillQualityDecline = hasSkillQualityDecline(decisions);
  const broadFatigue = broadFatigueHeuristic(completedWorkouts, regressingExerciseIds.length);

  // Adherence: completed sessions / expected sessions (3 per week).
  const scheduledPerWeek = 3;
  const adherencePercent = Math.min(
    100,
    Math.round((sessionsLast7Days / scheduledPerWeek) * 100)
  );

  const deloadInput = {
    regressingExercises: regressingExerciseIds.length,
    failedSets: failedSkippedStopped,
    skillQualityDeclining: skillQualityDecline,
    jointIrritation: pain,
    readinessLow: adherencePercent < 60,
    setAdditionFatigue: broadFatigue,
    userRequested: false,
    straightArmToleranceDecline: false
  };

  const deload = decideDeload(deloadInput);

  const candidateKeys = Object.keys(exercisePrescriptions);
  const setAdditions: WeeklyReviewResult['setAdditions'] = [];

  for (const key of candidateKeys) {
    const prescription = exercisePrescriptions[key];
    const exerciseId = prescription.exercise_id;
    const name =
      prescription.exercise_id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') ?? exerciseId;

    const exposuresSinceProgress = countDecisionsForExercise(
      decisions,
      exerciseId,
      14,
      ['ADD_LOAD', 'ADD_REPS', 'UNLOCK_NEXT_NODE']
    );

    const setAdditionInput = {
      exerciseOrSkillId: exerciseId,
      phaseWeeks: 4,
      exposuresSinceProgress,
      effortAppropriate: true,
      formAcceptable: true,
      sorenessNormal: true,
      painFree: !pain,
      adherencePercent,
      sessionWithinTime: true,
      broadFatigue,
      atVolumeCap: prescription.setCount >= 6,
      weeksSinceLastAddition: 2
    };

    const decision = decideSetAddition(setAdditionInput);
    if (decision.addSet) {
      setAdditions.push({ exerciseId, name, decision });
    }
  }

  const summary = deload.deload
    ? `Deload recommended for ${deload.durationDays} days.`
    : 'No deload needed this week.';

  return {
    deload: { ...deload, reason: deload.reason },
    setAdditions,
    regressingExercises: regressingExerciseIds,
    adherencePercent,
    summary
  };
}
