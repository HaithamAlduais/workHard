import type { StrengthDecision, HypertrophyDecision, SkillDecision, SkillNode } from '../types.js';

export type ExerciseProgressionState =
  | 'maintain'
  | 'add_reps'
  | 'add_load'
  | 'reduce_load'
  | 'hold_safety'
  | 'deload'
  | 'set_addition';

export type SkillProgressionState =
  | 'maintain'
  | 'add_rep'
  | 'add_hold_time'
  | 'reduce_assistance'
  | 'increase_leverage'
  | 'add_load'
  | 'unlock_next'
  | 'regress'
  | 'hold_safety'
  | 'deload_skill';

export type OverrideReason =
  | 'equipment_unavailable'
  | 'pain'
  | 'fatigue'
  | 'illness'
  | 'weight_increment_unavailable'
  | 'coach_instruction'
  | 'personal_choice'
  | 'other';

export interface OverrideRecord {
  originalRecommendation: StrengthDecision | HypertrophyDecision | SkillDecision;
  userOverride: StrengthDecision | HypertrophyDecision | SkillDecision;
  reason: OverrideReason;
  timestamp: Date;
  affectsProgressionEligibility: boolean;
}

export interface ExercisePrescription {
  user_id: string;
  exercise_id: string;
  program_day_id: string;
  currentLoad: number;
  nextLoad: number;
  setCount: number;
  targetRepRange: { min: number; max: number };
  exactNextTargets: number[];
  targetRIR: number;
  restSeconds: number;
  bodyRegion: 'upper' | 'lower' | 'core';
  smallestPlateKg: number;
  progressionState: ExerciseProgressionState;
  lastCompletedSessionId: string | null;
  lastDecisionId: string | null;
  activeDeload: boolean;
  activeSetAddition: boolean;
  overrideStatus: OverrideRecord | null;
  createdAt: Date;
  updatedAt: Date;
  client_id: string;
}

export interface SkillPrescription {
  user_id: string;
  skill_node_id: string;
  skill_family_id: string;
  currentNode: string;
  nextCandidateNode: string | null;
  targetSets: number;
  targetRepsOrHoldSeconds: number;
  assistance: string;
  leverageLevel: string;
  externalLoad: number;
  loadPlacement: string;
  apparatus: string;
  grip: string;
  modifiers: Record<string, string>;
  qualityTarget: number;
  requiredSuccessfulExposures: number;
  progressionState: SkillProgressionState;
  lastCompletedExposure: string | null;
  activeSafetyHold: boolean;
  createdAt: Date;
  updatedAt: Date;
  client_id: string;
}

export interface ExerciseSpec {
  targetLoadKg: number;
  setCount: number;
  targetRepRange: { min: number; max: number };
  targetRIR: number;
  restSeconds: number;
}

export type PrescriptionDecision = StrengthDecision | HypertrophyDecision | SkillDecision;
