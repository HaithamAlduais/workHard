import {
  getHybridProgramDay,
  startWorkoutStateWithProgramDay,
  updateSkillPrescriptionStatuses,
  evaluateReplacementsForDay,
  applyReplacementToDay,
  type ActiveWorkoutState
} from '@gravitypath/domain';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useEquipmentStore } from '../stores/equipmentStore';
import { aggregateWeeklyVolume, getPainFlaggedExerciseIds } from './readiness';
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

  const { day, warnings } = getHybridProgramDay(dayId, {
    priority,
    skillPrescriptions,
    unlockStates,
    startingNodes: calibration.skillStartingNodesByFamily,
    availableMinutes: 60
  });

  const { completedWorkouts, sets } = useWorkoutStore.getState();
  const weeklyVolumeByMuscle: Record<string, { muscleId: string; directSets: number }> = {};
  for (const [muscleId, entry] of Object.entries(aggregateWeeklyVolume(completedWorkouts, sets))) {
    weeklyVolumeByMuscle[muscleId] = { muscleId, directSets: entry.directSets };
  }
  const painFlaggedExerciseIds = getPainFlaggedExerciseIds(completedWorkouts, sets);
  const painFree = painFlaggedExerciseIds.length === 0;

  const replacementEvaluation = evaluateReplacementsForDay(day, {
    userId,
    equipmentOwned: useEquipmentStore.getState().getOwnedList(),
    unlockStates,
    skillAttempts: useSkillStore.getState().attempts.map((a) => ({
      ...a,
      completedAt: new Date(a.completedAt),
      userId: 'local',
      painLevel: a.painLevel as 0 | 1 | 2 | 3,
      selfReported: !a.videoVerified && !a.coachVerified
    })),
    weeklyVolumeByMuscle,
    sessionTimeMinutes: day.targetDurationMinutes,
    painFree
  });

  const approvedDecisions = new Map<string, { decision: import('@gravitypath/domain').ReplacementDecision; calisthenicsNode: import('@gravitypath/domain').SkillNode }>();
  const { activeReplacements } = prescriptionStore;
  for (const [exerciseId, result] of replacementEvaluation.decisions.entries()) {
    const active = activeReplacements[exerciseId];
    if (active && active.status === 'active' && active.percentage === result.decision.percentage) {
      approvedDecisions.set(exerciseId, result);
    }
  }

  const dayWithReplacements = applyReplacementToDay(day, approvedDecisions);
  const workout = startWorkoutStateWithProgramDay(dayWithReplacements, { warnings });
  return prescriptionStore.applyPrescriptionsToWorkout(workout);
}

export function applyDecisionsToPrescriptions(
  decisions: ProgressionDecision[],
  dayId: string,
  sessionId: string
): void {
  usePrescriptionStore.getState().applyProgressionDecisions(decisions, dayId, sessionId);
}
