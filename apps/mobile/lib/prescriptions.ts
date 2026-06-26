import { startWorkoutState, type ActiveWorkoutState } from '@gravitypath/domain';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import type { ProgressionDecision } from '../stores/workoutStore';

export function bodyRegionFor(exerciseId: string): 'upper' | 'lower' | 'core' {
  const lower = [
    'squat',
    'deadlift',
    'pistol',
    'calf',
    'leg-curl',
    'leg-extension',
    'hack-squat',
    'romanian',
    'trap-bar-jump',
    'box-jump'
  ];
  if (lower.some((k) => exerciseId.includes(k))) return 'lower';

  const core = ['l-sit', 'plank', 'front-lever', 'back-lever', 'planche', 'hollow-body', 'compression'];
  if (core.some((k) => exerciseId.includes(k))) return 'core';

  return 'upper';
}

export function startWorkoutStateWithPrescriptions(
  dayId: string,
  userId: string = 'local',
  _getExercisePrescription?: (dayId: string, exerciseId: string) => import('../stores/prescriptionStore').ExercisePrescriptionWithMeta | undefined
): ActiveWorkoutState {
  const prescriptionStore = usePrescriptionStore.getState();
  if (!prescriptionStore.initialized) {
    prescriptionStore.initializePrescriptions(userId);
  }
  const workout = startWorkoutState(dayId);
  return prescriptionStore.applyPrescriptionsToWorkout(workout);
}

export function applyDecisionsToPrescriptions(
  decisions: ProgressionDecision[],
  dayId: string,
  sessionId: string
): void {
  usePrescriptionStore.getState().applyProgressionDecisions(decisions, dayId, sessionId);
}
