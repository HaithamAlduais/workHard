import { getSkillNode, getProgramDay } from '@gravitypath/domain';
import type { ProgressionDecision } from '../stores/workoutStore';
import type { SkillPriority, SkillPrescription } from '@gravitypath/domain';
import type {
  ExercisePrescriptionWithMeta,
  SkillPrescriptionWithMeta
} from '../stores/prescriptionStore';

export interface CoachMessage {
  title: string;
  body: string;
  tone: 'neutral' | 'positive' | 'warning' | 'action';
}

function explainExerciseState(state: string): string {
  switch (state) {
    case 'add_reps':
      return 'You are progressing by adding reps within the target range before increasing load.';
    case 'add_load':
      return 'You hit the top of the rep range, so the next step is more weight.';
    case 'reduce_load':
      return 'Recent quality dropped or pain was reported; load is being reduced to recover form.';
    case 'hold_safety':
      return 'Progression is paused until pain clears or form stabilizes.';
    case 'deload':
      return 'You are in a deload week. Keep reps easy and do not chase records.';
    case 'set_addition':
      return 'Volume is being increased by adding a set before increasing intensity.';
    default:
      return 'Hold the current target and focus on clean execution.';
  }
}

function explainSkillState(state: string): string {
  switch (state) {
    case 'add_rep':
      return 'Add one rep while keeping quality high.';
    case 'add_hold_time':
      return 'Hold the position a little longer per set.';
    case 'reduce_assistance':
      return 'Use less assistance so the skill becomes more self-supported.';
    case 'increase_leverage':
      return 'Move to a harder leverage position.';
    case 'add_load':
      return 'Add external load now that the leverage is solid.';
    case 'unlock_next':
      return 'You have met the unlock criteria; the next progression is available.';
    case 'regress':
      return 'Move back to an easier variation to rebuild quality.';
    case 'hold_safety':
      return 'Hold this variation until the safety concern is resolved.';
    case 'deload_skill':
      return 'Reduce skill volume this week to recover.';
    default:
      return 'Maintain the current target and chase quality, not fatigue.';
  }
}

export function buildCoachMessage(
  prescription: ExercisePrescriptionWithMeta | SkillPrescriptionWithMeta,
  decision?: ProgressionDecision
): string {
  if ('exercise_id' in prescription) {
    const name = exerciseName(prescription.exercise_id);
    const load = prescription.currentLoad;
    const reps = `${prescription.targetRepRange.min}-${prescription.targetRepRange.max}`;
    const explanation = explainExerciseState(prescription.progressionState);
    const decisionText = decision ? ` Latest decision: ${decision.reason}` : '';
    return `${name}: ${load} kg for ${reps} reps. ${explanation}${decisionText}`;
  }

  const name = nodeName(prescription.currentNode);
  const target =
    prescription.targetRepsOrHoldSeconds > 0
      ? `${prescription.targetRepsOrHoldSeconds}${prescription.targetSets > 0 ? ' reps/hold' : 's'}`
      : 'as prescribed';
  const leverage = prescription.leverageLevel !== 'full' ? ` at ${prescription.leverageLevel} leverage` : '';
  const assistance = prescription.assistance !== 'none' ? ` with ${prescription.assistance} assistance` : '';
  const statusText = prescription.status ? ` (${prescription.status.replace(/_/g, ' ')})` : '';
  const explanation = explainSkillState(prescription.progressionState);
  const decisionText = decision ? ` Latest decision: ${decision.reason}` : '';
  return `${name}${statusText}: ${target}${leverage}${assistance}. ${explanation}${decisionText}`;
}

function exerciseName(exerciseId: string): string {
  for (const dayId of ['day1', 'day2', 'day3']) {
    const day = getProgramDay(dayId);
    const ex = day?.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) return ex.name;
  }
  const node = getSkillNode(exerciseId);
  if (node) return node.name;
  return exerciseId;
}

function nodeName(nodeId: string): string {
  return getSkillNode(nodeId)?.name ?? nodeId;
}

export function buildCoachMessages({
  progressionDecisions,
  pendingSets,
  nextScheduledDate,
  trainingDays,
  priority,
  skillPrescriptions,
  readiness,
  replacementDecisions
}: {
  progressionDecisions: ProgressionDecision[];
  pendingSets: number;
  nextScheduledDate: string;
  trainingDays: number[];
  priority: SkillPriority;
  skillPrescriptions: Record<string, SkillPrescriptionWithMeta>;
  readiness?: Map<string, { pattern: string; equipmentReady: boolean; performanceReady: boolean; volumeReady: boolean; timeReady: boolean; painFree: boolean; blockers: string[] }>;
  replacementDecisions?: Map<string, { decision: { allowed: boolean; percentage: number; reason: string; conditions: string[] }; calisthenicsNode: { name: string } }>;
}): CoachMessage[] {
  const messages: CoachMessage[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const primaryPrescription = Object.values(skillPrescriptions).find(
    (p) => p.skill_family_id === priority.primarySkillFamilyId && p.status === 'active_primary'
  );

  if (primaryPrescription) {
    messages.push({
      title: 'Primary Skill Focus',
      body: `${nodeName(primaryPrescription.currentNode)} is your primary focus. Aim for quality exposures and only progress when the target is consistently clean.`,
      tone: 'positive'
    });
  }

  if (progressionDecisions.length === 0) {
    messages.push({
      title: 'GravityPath Coach',
      body: 'Complete a workout to receive grounded progression guidance based on your actual data.',
      tone: 'neutral'
    });
  } else {
    const latest = progressionDecisions.slice(-5);
    for (const decision of latest) {
      const name = exerciseName(decision.exerciseId);
      const target = decision.targetNodeId ? ` → ${nodeName(decision.targetNodeId)}` : '';
      let tone: CoachMessage['tone'] = 'neutral';
      if (decision.decisionType.includes('UNLOCK') || decision.decisionType.includes('ADD_LOAD') || decision.decisionType.includes('ADD_REP')) {
        tone = 'positive';
      } else if (decision.decisionType.includes('HOLD') || decision.decisionType.includes('STOP') || decision.decisionType.includes('REGRESS')) {
        tone = 'warning';
      } else if (decision.decisionType.includes('REQUIRE')) {
        tone = 'action';
      }
      messages.push({
        title: `${name}${target}`,
        body: decision.reason,
        tone
      });
    }
  }

  if (pendingSets > 0) {
    messages.push({
      title: 'Sync',
      body: `${pendingSets} set${pendingSets === 1 ? '' : 's'} pending upload. Connect to the internet to sync your workout data.`,
      tone: 'action'
    });
  }

  messages.push({
    title: 'Schedule',
    body: `Next session: ${new Date(nextScheduledDate).toLocaleDateString()} (${trainingDays
      .map((d) => dayNames[d])
      .join(', ')}).`,
    tone: 'neutral'
  });

  if (readiness) {
    const notReady = Array.from(readiness.values()).filter(
      (r) => !r.equipmentReady || !r.performanceReady || !r.volumeReady || !r.timeReady || !r.painFree
    );
    if (notReady.length > 0) {
      const top = notReady.slice(0, 2);
      messages.push({
        title: 'Home Readiness',
        body: `${notReady.length} movement pattern(s) are not home-ready. ${top
          .map((r) => `${r.pattern}: ${r.blockers[0] ?? 'blocked'}`)
          .join('; ')}.`,
        tone: 'warning'
      });
    } else {
      messages.push({
        title: 'Home Readiness',
        body: 'All movement patterns are home-ready. You can maintain progress without the gym.',
        tone: 'positive'
      });
    }
  }

  if (replacementDecisions && replacementDecisions.size > 0) {
    for (const [exerciseId, result] of replacementDecisions.entries()) {
      const { decision, calisthenicsNode } = result;
      if (decision.allowed) {
        messages.push({
          title: `Replacement available: ${exerciseId}`,
          body: `${calisthenicsNode.name} is ready to replace ${decision.percentage}% of ${exerciseId.replace(/-/g, ' ')}. ${decision.reason}`,
          tone: 'positive'
        });
      } else {
        messages.push({
          title: `Replacement blocked: ${exerciseId}`,
          body: `${exerciseId.replace(/-/g, ' ')} cannot be replaced yet. ${decision.reason}`,
          tone: 'warning'
        });
      }
    }
  }

  messages.push({
    title: 'Power Work',
    body: 'Power exercises are not automatically replaced with calisthenics to preserve velocity and landing quality. Keep them in the program until you have a safe home power option.',
    tone: 'neutral'
  });

  return messages;
}
