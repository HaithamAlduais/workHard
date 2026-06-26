import {
  startWorkoutStateWithSkillSlots,
  updateSkillPrescriptionStatuses,
  type ActiveWorkoutState
} from '@gravitypath/domain';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
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
  userId: string = 'local'
): ActiveWorkoutState {
  const prescriptionStore = usePrescriptionStore.getState();
  const calibration = useCalibrationStore.getState();
  if (!prescriptionStore.initialized) {
    prescriptionStore.initializePrescriptions(userId, calibration);
  }

  const priority = useSkillPriorityStore.getState();
  const unlockStates = useSkillStore.getState().getUnlockStates();
  const skillPrescriptions = { ...prescriptionStore.skillPrescriptions };
  const statuses = updateSkillPrescriptionStatuses(priority, skillPrescriptions, unlockStates);
  for (const [nodeId, status] of Object.entries(statuses)) {
    const existing = skillPrescriptions[nodeId];
    if (existing) {
      skillPrescriptions[nodeId] = { ...existing, status };
    }
  }

  const workout = startWorkoutStateWithSkillSlots(dayId, {
    priority,
    skillPrescriptions,
    unlockStates,
    startingNodes: calibration.skillStartingNodes,
    availableMinutes: 60
  });

  return prescriptionStore.applyPrescriptionsToWorkout(workout);
}

export function applyDecisionsToPrescriptions(
  decisions: ProgressionDecision[],
  dayId: string,
  sessionId: string
): void {
  usePrescriptionStore.getState().applyProgressionDecisions(decisions, dayId, sessionId);
}
