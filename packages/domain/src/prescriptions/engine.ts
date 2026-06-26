import type {
  ExercisePrescription,
  SkillPrescription,
  ExerciseSpec,
  OverrideRecord,
  ExerciseProgressionState,
  SkillProgressionState
} from './types.js';
import type { StrengthDecision, HypertrophyDecision, SkillDecision, SkillNode } from '../types.js';

export interface CreateExercisePrescriptionInput {
  userId: string;
  programDayId: string;
  exerciseId: string;
  exerciseSpec: ExerciseSpec;
  bodyRegion: 'upper' | 'lower' | 'core';
  smallestPlateKg: number;
  calibrationLoad?: number;
  clientId?: string;
}

export interface CreateSkillPrescriptionInput {
  userId: string;
  node: SkillNode;
  startingNodeId?: string;
  clientId?: string;
}

const ASSISTANCE_LEVELS = ['heavy', 'medium', 'light', 'none'];
const LEVERAGE_LEVELS = ['full', 'advanced', 'intermediate', 'beginner', 'minimal'];

function roundToPlate(loadKg: number, plateKg: number): number {
  const rounded = Math.round(loadKg / plateKg) * plateKg;
  return Math.max(0, Number(rounded.toFixed(2)));
}

function stepDown(levels: string[], current: string): string {
  const idx = levels.indexOf(current);
  if (idx === -1) return levels[Math.max(0, levels.length - 2)];
  return levels[Math.min(levels.length - 1, idx + 1)];
}

function distributeRepTargets(min: number, max: number, count: number): number[] {
  const span = max - min;
  const targets: number[] = [];
  for (let i = 0; i < count; i++) {
    const position = count <= 1 ? 0 : i / (count - 1);
    const value = Math.min(max, Math.max(min, Math.round(min + span * position)));
    targets.push(value);
  }
  return targets;
}

export function nextPerSetRepTargets(
  currentTargets: number[],
  repRange: { min: number; max: number },
  decisionType: string
): number[] {
  if (decisionType === 'ADD_LOAD') {
    return currentTargets.map(() => repRange.min);
  }

  if (decisionType === 'REDUCE_LOAD') {
    return currentTargets.map((_, index) => {
      const position = currentTargets.length <= 1 ? 0 : index / (currentTargets.length - 1);
      const raw = repRange.min + (repRange.max - repRange.min) * position * 0.5;
      return Math.min(repRange.max, Math.max(repRange.min, Math.round(raw)));
    });
  }

  if (decisionType === 'ADD_REPS') {
    const minValue = Math.min(...currentTargets);
    if (minValue >= repRange.max) {
      return [...currentTargets];
    }
    const idx = currentTargets.findIndex((t) => t === minValue);
    const result = [...currentTargets];
    result[idx] = Math.min(repRange.max, result[idx] + 1);
    return result;
  }

  return [...currentTargets];
}

export function createExercisePrescription(input: CreateExercisePrescriptionInput): ExercisePrescription {
  const {
    userId,
    programDayId,
    exerciseId,
    exerciseSpec,
    bodyRegion,
    smallestPlateKg,
    calibrationLoad,
    clientId
  } = input;

  const now = new Date();
  const currentLoad = calibrationLoad ?? exerciseSpec.targetLoadKg ?? 0;
  const setCount = exerciseSpec.setCount ?? 1;

  return {
    user_id: userId,
    exercise_id: exerciseId,
    program_day_id: programDayId,
    currentLoad,
    nextLoad: currentLoad,
    setCount,
    targetRepRange: { ...exerciseSpec.targetRepRange },
    exactNextTargets: distributeRepTargets(exerciseSpec.targetRepRange.min, exerciseSpec.targetRepRange.max, setCount),
    targetRIR: exerciseSpec.targetRIR ?? 1,
    restSeconds: exerciseSpec.restSeconds ?? 120,
    bodyRegion,
    smallestPlateKg,
    progressionState: 'maintain',
    lastCompletedSessionId: null,
    lastDecisionId: null,
    activeDeload: false,
    activeSetAddition: false,
    overrideStatus: null,
    createdAt: now,
    updatedAt: now,
    client_id: clientId ?? userId
  };
}

export function applyStrengthDecision(
  prescription: ExercisePrescription,
  decision: StrengthDecision
): ExercisePrescription {
  const now = new Date();

  switch (decision.type) {
    case 'ADD_REPS': {
      return {
        ...prescription,
        exactNextTargets: nextPerSetRepTargets(prescription.exactNextTargets, prescription.targetRepRange, 'ADD_REPS'),
        progressionState: 'add_reps' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'ADD_LOAD': {
      const nextLoad = roundToPlate(decision.newLoadKg, prescription.smallestPlateKg);
      return {
        ...prescription,
        currentLoad: nextLoad,
        nextLoad,
        exactNextTargets: nextPerSetRepTargets(prescription.exactNextTargets, prescription.targetRepRange, 'ADD_LOAD'),
        progressionState: 'add_load' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'REDUCE_LOAD': {
      const nextLoad = roundToPlate(decision.newLoadKg, prescription.smallestPlateKg);
      return {
        ...prescription,
        currentLoad: nextLoad,
        nextLoad,
        exactNextTargets: nextPerSetRepTargets(
          prescription.exactNextTargets,
          prescription.targetRepRange,
          'REDUCE_LOAD'
        ),
        progressionState: 'reduce_load' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'HOLD_FOR_SAFETY': {
      return {
        ...prescription,
        progressionState: 'hold_safety' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'MAINTAIN_LOAD':
    default: {
      return {
        ...prescription,
        progressionState: 'maintain' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
  }
}

export function applyHypertrophyDecision(
  prescription: ExercisePrescription,
  decision: HypertrophyDecision
): ExercisePrescription {
  const now = new Date();

  switch (decision.type) {
    case 'ADD_REPS': {
      return {
        ...prescription,
        exactNextTargets: nextPerSetRepTargets(prescription.exactNextTargets, prescription.targetRepRange, 'ADD_REPS'),
        progressionState: 'add_reps' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'ADD_LOAD': {
      const nextLoad = roundToPlate(decision.newLoadKg, prescription.smallestPlateKg);
      return {
        ...prescription,
        currentLoad: nextLoad,
        nextLoad,
        exactNextTargets: nextPerSetRepTargets(prescription.exactNextTargets, prescription.targetRepRange, 'ADD_LOAD'),
        progressionState: 'add_load' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'REDUCE_LOAD': {
      const nextLoad = roundToPlate(decision.newLoadKg, prescription.smallestPlateKg);
      return {
        ...prescription,
        currentLoad: nextLoad,
        nextLoad,
        exactNextTargets: nextPerSetRepTargets(
          prescription.exactNextTargets,
          prescription.targetRepRange,
          'REDUCE_LOAD'
        ),
        progressionState: 'reduce_load' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'HOLD_FOR_SAFETY': {
      return {
        ...prescription,
        progressionState: 'hold_safety' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
    case 'MAINTAIN_LOAD':
    default: {
      return {
        ...prescription,
        progressionState: 'maintain' satisfies ExerciseProgressionState,
        updatedAt: now
      };
    }
  }
}

export function createSkillPrescription(input: CreateSkillPrescriptionInput): SkillPrescription {
  const { userId, node, startingNodeId, clientId } = input;
  const now = new Date();

  const targetSets = node.targetDose.sets ?? 1;
  const targetRepsOrHoldSeconds =
    node.staticOrDynamic === 'static' ? (node.targetDose.holdSecondsMin ?? 0) : (node.targetDose.repsMin ?? 0);

  return {
    user_id: userId,
    skill_node_id: node.id,
    skill_family_id: node.familyId,
    currentNode: startingNodeId ?? node.id,
    nextCandidateNode: node.progressions[0] ?? null,
    targetSets,
    targetRepsOrHoldSeconds,
    assistance: 'none',
    leverageLevel: 'full',
    externalLoad: 0,
    loadPlacement: 'none',
    apparatus: node.apparatus[0] ?? 'none',
    grip: 'neutral',
    modifiers: {},
    qualityTarget: node.targetQuality,
    requiredSuccessfulExposures: node.unlockRule.requiredSuccessfulExposures,
    progressionState: 'maintain',
    lastCompletedExposure: null,
    activeSafetyHold: false,
    createdAt: now,
    updatedAt: now,
    client_id: clientId ?? userId
  };
}

export function applySkillDecision(prescription: SkillPrescription, decision: SkillDecision): SkillPrescription {
  const now = new Date();

  switch (decision.type) {
    case 'ADD_REP': {
      return {
        ...prescription,
        targetRepsOrHoldSeconds: prescription.targetRepsOrHoldSeconds + 1,
        progressionState: 'add_rep' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'ADD_HOLD_TIME': {
      const step = Math.max(1, Math.round(prescription.targetRepsOrHoldSeconds * 0.1));
      return {
        ...prescription,
        targetRepsOrHoldSeconds: prescription.targetRepsOrHoldSeconds + step,
        progressionState: 'add_hold_time' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'REDUCE_ASSISTANCE': {
      return {
        ...prescription,
        assistance: stepDown(ASSISTANCE_LEVELS, prescription.assistance),
        progressionState: 'reduce_assistance' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'INCREASE_LEVERAGE': {
      return {
        ...prescription,
        leverageLevel: stepDown(LEVERAGE_LEVELS, prescription.leverageLevel),
        progressionState: 'increase_leverage' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'ADD_LOAD': {
      return {
        ...prescription,
        externalLoad: Number((prescription.externalLoad + 1).toFixed(2)),
        progressionState: 'add_load' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'UNLOCK_NEXT_NODE': {
      return {
        ...prescription,
        progressionState: 'unlock_next' satisfies SkillProgressionState,
        nextCandidateNode: decision.targetNodeId,
        updatedAt: now
      };
    }
    case 'REGRESS_NODE': {
      return {
        ...prescription,
        currentNode: decision.targetNodeId,
        nextCandidateNode: prescription.currentNode,
        progressionState: 'regress' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'HOLD_FOR_SAFETY':
    case 'STOP_BLOCK_DUE_TO_QUALITY_DROP': {
      return {
        ...prescription,
        activeSafetyHold: true,
        progressionState: 'hold_safety' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'DELOAD_SKILL': {
      return {
        ...prescription,
        progressionState: 'deload_skill' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
    case 'MAINTAIN_NODE':
    default: {
      return {
        ...prescription,
        progressionState: 'maintain' satisfies SkillProgressionState,
        updatedAt: now
      };
    }
  }
}

export function applyOverride<T extends { overrideStatus: OverrideRecord | null; updatedAt: Date }>(
  prescription: T,
  override: OverrideRecord
): T {
  return {
    ...prescription,
    overrideStatus: override,
    updatedAt: new Date()
  };
}
