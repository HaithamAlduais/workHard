import { getSkillNode, getProgramDay } from '@gravitypath/domain';
import type { ProgressionDecision } from '../stores/workoutStore';

export interface CoachMessage {
  title: string;
  body: string;
  tone: 'neutral' | 'positive' | 'warning' | 'action';
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
  trainingDays
}: {
  progressionDecisions: ProgressionDecision[];
  pendingSets: number;
  nextScheduledDate: string;
  trainingDays: number[];
}): CoachMessage[] {
  const messages: CoachMessage[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  return messages;
}
