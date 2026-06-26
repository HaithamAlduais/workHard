import type { SetAdditionInput, SetAdditionDecision } from '../types.js';

export function decideSetAddition(input: SetAdditionInput): SetAdditionDecision {
  const {
    phaseWeeks,
    exposuresSinceProgress,
    effortAppropriate,
    formAcceptable,
    sorenessNormal,
    painFree,
    adherencePercent,
    sessionWithinTime,
    broadFatigue,
    atVolumeCap,
    weeksSinceLastAddition
  } = input;

  if (phaseWeeks < 4) {
    return { addSet: false, reason: 'First four weeks of phase. No set additions.' };
  }

  if (exposuresSinceProgress < 2) {
    return { addSet: false, reason: 'Progression still possible through reps/load/leverage. No set addition.' };
  }

  if (weeksSinceLastAddition < 2) {
    return { addSet: false, reason: 'Only one muscle/skill may receive added volume in a two-week period.' };
  }

  const conditions = [
    effortAppropriate,
    formAcceptable,
    sorenessNormal,
    painFree,
    adherencePercent >= 0.8,
    sessionWithinTime,
    !broadFatigue,
    !atVolumeCap
  ];

  if (conditions.every(Boolean)) {
    return { addSet: true, reason: 'Plateau with appropriate effort, good form, recovery, and time budget. Add one weekly set.' };
  }

  const failed = [
    !effortAppropriate && 'effort not appropriate',
    !formAcceptable && 'form not acceptable',
    !sorenessNormal && 'soreness abnormal',
    !painFree && 'pain present',
    adherencePercent < 0.8 && 'adherence below 80%',
    !sessionWithinTime && 'session exceeds time budget',
    broadFatigue && 'broad fatigue present',
    atVolumeCap && 'at volume cap'
  ].filter(Boolean);

  return { addSet: false, reason: `Set addition blocked: ${failed.join(', ')}.` };
}
