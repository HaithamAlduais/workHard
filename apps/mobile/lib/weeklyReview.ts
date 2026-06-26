import { decideDeload, decideSetAddition, getSkillNode } from '@gravitypath/domain';
import type {
  DeloadDecision,
  SetAdditionDecision,
  ActiveWorkoutState,
  SkillPriority,
  SkillUnlockState,
  SkillPrescription,
  SkillAttempt
} from '@gravitypath/domain';
import type { ProgressionDecision } from '../stores/workoutStore';
import type {
  ExercisePrescriptionWithMeta,
  SkillPrescriptionWithMeta
} from '../stores/prescriptionStore';

export interface SkillReviewSummary {
  familyId: string;
  progressPercent: number;
  exposuresLast7Days: number;
  averageQualityLast7Days: number;
  highestUnlockedNode: string;
}

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
  skillSummary: SkillReviewSummary[];
  rotationRecommendation: 'continue' | 'rotate' | 'start_new_block';
  rotationReason: string;
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
    return durationMinutes > 75;
  }).length;
  return longOrStoppedSessions >= 2 || regressingCount >= 2;
}

function buildSkillSummary(
  priority: SkillPriority,
  skillPrescriptions: Record<string, SkillPrescriptionWithMeta>,
  unlockStates: Map<string, SkillUnlockState>,
  skillAttempts: SkillAttempt[]
): SkillReviewSummary[] {
  const activeFamilies = [
    priority.primarySkillFamilyId,
    ...priority.secondarySkillFamilyIds
  ];

  const summaries: SkillReviewSummary[] = [];
  for (const familyId of activeFamilies) {
    const familyPrescriptions = Object.values(skillPrescriptions).filter(
      (p) => p.skill_family_id === familyId
    );
    let highestStage = 0;
    let highestUnlockedNode = '';
    for (const prescription of familyPrescriptions) {
      const node = getSkillNode(prescription.skill_node_id);
      const state = unlockStates.get(prescription.skill_node_id);
      if (state && (state.status === 'unlocked' || state.status === 'mastered') && node) {
        highestStage = Math.max(highestStage, node.stage);
        highestUnlockedNode = prescription.skill_node_id;
      }
    }

    const recentAttempts = skillAttempts.filter(
      (a) =>
        familyPrescriptions.some((p) => p.skill_node_id === a.skillNodeId) &&
        isWithinDays(typeof a.completedAt === 'string' ? a.completedAt : a.completedAt.toISOString(), 7)
    );

    const averageQuality =
      recentAttempts.length > 0
        ? recentAttempts.reduce((sum, a) => sum + a.qualityScore, 0) / recentAttempts.length
        : 0;

    summaries.push({
      familyId,
      progressPercent: Math.min(100, highestStage * 12),
      exposuresLast7Days: recentAttempts.length,
      averageQualityLast7Days: Math.round(averageQuality * 100) / 100,
      highestUnlockedNode
    });
  }
  return summaries;
}

function rotationRecommendation(
  priority: SkillPriority,
  skillSummary: SkillReviewSummary[]
): { recommendation: 'continue' | 'rotate' | 'start_new_block'; reason: string } {
  const primary = skillSummary.find((s) => s.familyId === priority.primarySkillFamilyId);
  const blockEnded = priority.blockEnd ? new Date(priority.blockEnd).getTime() <= Date.now() : false;

  if (blockEnded && primary && primary.progressPercent >= 80) {
    return { recommendation: 'rotate', reason: 'Primary skill is near mastery and block has ended. Rotate primary focus.' };
  }
  if (blockEnded) {
    return { recommendation: 'start_new_block', reason: 'Block has ended. Start a new block with the same or adjusted priorities.' };
  }
  if (primary && primary.progressPercent >= 95) {
    return { recommendation: 'rotate', reason: 'Primary skill is mastered. Consider rotating focus.' };
  }
  return { recommendation: 'continue', reason: 'Continue current block and priorities.' };
}

export function runWeeklyReview(
  completedWorkouts: ActiveWorkoutState[],
  decisions: ProgressionDecision[],
  exercisePrescriptions: Record<string, ExercisePrescriptionWithMeta>,
  skillPrescriptions: Record<string, SkillPrescriptionWithMeta>,
  priority: SkillPriority,
  unlockStates: Map<string, SkillUnlockState>,
  skillAttempts: SkillAttempt[]
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
    const name = prescription.exercise_id
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

  const skillSummary = buildSkillSummary(priority, skillPrescriptions, unlockStates, skillAttempts);
  const rotation = rotationRecommendation(priority, skillSummary);

  const summary = deload.deload
    ? `Deload recommended for ${deload.durationDays} days.`
    : rotation.recommendation === 'continue'
      ? 'No deload needed this week. Continue the current block.'
      : rotation.reason;

  return {
    deload: { ...deload, reason: deload.reason },
    setAdditions,
    regressingExercises: regressingExerciseIds,
    adherencePercent,
    summary,
    skillSummary,
    rotationRecommendation: rotation.recommendation,
    rotationReason: rotation.reason
  };
}
