export type UnitSystem = 'metric' | 'imperial';
export type Locale = 'en' | 'ar';
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';

export interface AppSettings {
  appName: string;
  defaultLocale: Locale;
  supportedLocales: Locale[];
}

export interface UserProfile {
  id: string;
  name: string;
  locale: Locale;
  unitSystem: UnitSystem;
  timezone: string;
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  bodyweightKg: number;
  heightCm?: number;
  gender?: Gender;
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
}

export type ExerciseRole =
  | 'TECHNIQUE_ONLY'
  | 'POWER_ONLY'
  | 'STRENGTH_PRIMARY'
  | 'HYPERTROPHY_PRIMARY'
  | 'STRENGTH_AND_HYPERTROPHY'
  | 'SKILL_SPECIFIC'
  | 'JOINT_PREPARATION'
  | 'MOBILITY'
  | 'GRIP'
  | 'RECOVERY';

export type SessionOrderClass =
  | 'TECHNIQUE_FIRST'
  | 'POWER'
  | 'STRENGTH_SKILL'
  | 'HYPERTROPHY_SKILL'
  | 'GYM_STRENGTH'
  | 'GYM_HYPERTROPHY'
  | 'ACCESSORY'
  | 'PREPARATION'
  | 'RECOVERY';

export type PairType = 'STRAIGHT' | 'ALT' | 'SS' | 'SKILL_CLUSTER';

export interface Exercise {
  id: string;
  movementPatternId: string;
  name: string;
  nameAr: string;
  role: ExerciseRole;
  orderClass: SessionOrderClass;
  equipmentIds: string[];
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
  requiresGym: boolean;
  canBeReplaced: boolean;
  defaultWarmupSeconds: number;
  defaultWorkingSetSeconds: number;
  transitionSeconds: number;
}

export interface SetLog {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  loadKg: number;
  repetitions: number;
  rir: number;
  rom: 'full' | 'partial' | 'assisted';
  form: 'good' | 'acceptable' | 'poor';
  painLevel: 0 | 1 | 2 | 3;
  restSecondsPlanned: number;
  restSecondsActual: number;
  completedAt: Date;
  videoId?: string;
  notes?: string;
}

export interface StaticHoldLog {
  id: string;
  skillAttemptId: string;
  bestCleanHoldSeconds: number;
  totalCleanHoldSeconds: number;
  numberOfValidHolds: number;
  medianHoldSeconds: number;
  qualityScore: number;
  leverageLevel: string;
  assistance: string;
  externalLoadKg: number;
  loadPlacement: string;
  painLevel: 0 | 1 | 2 | 3;
}

export interface StrengthProgressionInput {
  exerciseId: string;
  targetRange: { min: number; max: number };
  currentLoadKg: number;
  lastSets: Array<{ reps: number; rir: number; rom: 'full' | 'partial' | 'assisted'; form: 'good' | 'acceptable' | 'poor'; painLevel: number }>;
  bodyRegion: 'upper' | 'lower' | 'core';
  smallestPlateKg: number;
  requestedDeload?: boolean;
  painReported?: boolean;
}

export type StrengthDecision =
  | { type: 'ADD_REPS'; addedReps: number; reason: string }
  | { type: 'ADD_LOAD'; newLoadKg: number; incrementKg: number; reason: string }
  | { type: 'MAINTAIN_LOAD'; reason: string }
  | { type: 'REDUCE_LOAD'; newLoadKg: number; reductionPercent: number; reason: string }
  | { type: 'HOLD_FOR_SAFETY'; reason: string };

export interface HypertrophyProgressionInput {
  exerciseId: string;
  targetRange: { min: number; max: number };
  currentLoadKg: number;
  lastSets: Array<{ reps: number; rir: number; rom: 'full' | 'partial' | 'assisted'; form: 'good' | 'acceptable' | 'poor'; painLevel: number }>;
  smallestPlateKg: number;
  requestedDeload?: boolean;
  painReported?: boolean;
}

export type HypertrophyDecision =
  | { type: 'ADD_REPS'; addedReps: number; reason: string }
  | { type: 'ADD_LOAD'; newLoadKg: number; incrementKg: number; reason: string }
  | { type: 'MAINTAIN_LOAD'; reason: string }
  | { type: 'REDUCE_LOAD'; newLoadKg: number; reductionPercent: number; reason: string }
  | { type: 'HOLD_FOR_SAFETY'; reason: string };

export interface PowerQualityInput {
  exerciseId: string;
  sets: Array<{ quality: 'fast' | 'acceptable' | 'slower'; stopReason?: string }>;
}

export type PowerDecision =
  | { type: 'CONTINUE'; reason: string }
  | { type: 'STOP_VELOCITY_DROP'; reason: string }
  | { type: 'REDUCE_VOLUME'; reason: string };

export interface SkillNode {
  id: string;
  familyId: string;
  name: string;
  nameAr: string;
  stage: number;
  difficulty: 'fundamental' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  apparatus: string[];
  staticOrDynamic: 'static' | 'dynamic';
  bentOrStraightArm: 'bent' | 'straight' | 'mixed';
  role: 'technique' | 'strength' | 'skill';
  riskLevel: 'low' | 'medium' | 'high' | 'expert';
  targetDose: SkillDose;
  targetQuality: number;
  unlockRule: UnlockRule;
  regressRule: RegressRule;
  volumeRule: VolumeRule;
  prerequisites: string[];
  progressions: string[];
  regressions: string[];
  replacementCandidates: string[];
}

export interface SkillDose {
  sets?: number;
  repsMin?: number;
  repsMax?: number;
  holdSecondsMin?: number;
  holdSecondsMax?: number;
  dailyMinutes?: number;
  weeklyExposures?: number;
}

export interface UnlockRule {
  requiredExposures: number;
  requiredSuccessfulExposures: number;
  minQuality: number;
  requiresVideo: boolean;
  requiresCoach: boolean;
  expertLocked: boolean;
}

export interface RegressRule {
  failedExposures: number;
  minQuality: number;
  painBlocks: boolean;
}

export type VolumeRule =
  | 'TECHNIQUE_NO_VOLUME'
  | 'DYNAMIC_FULL_SET'
  | 'STATIC_EXPOSURE'
  | 'WEIGHTED_DYNAMIC_FULL_SET'
  | 'EXPERT_STATIC_LOCKED';

export interface SkillAttempt {
  id: string;
  userId: string;
  skillNodeId: string;
  workoutSessionId?: string;
  completedAt: Date;
  repetitions?: number;
  holdSeconds?: number;
  validHoldSeconds?: number;
  externalLoadKg: number;
  assistance: string;
  leverageLevel: string;
  loadPlacement: string;
  apparatus?: string;
  grip?: string;
  modifiers?: Record<string, string>;
  qualityScore: number;
  qualityDimensions: SkillQualityDimensions;
  painLevel: 0 | 1 | 2 | 3;
  fullRom: boolean;
  videoVerified: boolean;
  coachVerified: boolean;
  selfReported: boolean;
}

export interface SkillUnlockState {
  nodeId: string;
  status: 'locked' | 'available' | 'unlocked' | 'mastered' | 'safety_hold';
  reason: string;
}

export interface SkillQualityDimensions {
  bodyLine: number;
  scapularPosition: number;
  elbowPosition: number;
  symmetry: number;
  stability: number;
  momentum: number;
  rom: number;
  control: number;
}

export interface SkillExposureAggregate {
  workoutSessionId: string;
  attemptedSets: number;
  validSets: number;
  requiredSets: number;
  bestReps?: number;
  medianReps?: number;
  bestHoldSeconds?: number;
  medianHoldSeconds?: number;
  totalValidHoldSeconds?: number;
  minimumQuality: number;
  averageQuality: number;
  painReported: boolean;
}

export type SkillDecision =
  | { type: 'MAINTAIN_NODE'; reason: string }
  | { type: 'ADD_REP'; reason: string }
  | { type: 'ADD_HOLD_TIME'; reason: string }
  | { type: 'ADD_QUALITY_TARGET'; reason: string }
  | { type: 'REDUCE_ASSISTANCE'; reason: string }
  | { type: 'INCREASE_LEVERAGE'; reason: string }
  | { type: 'ADD_LOAD'; reason: string }
  | { type: 'ADD_SET'; reason: string }
  | { type: 'REMOVE_SET'; reason: string }
  | { type: 'REGRESS_NODE'; targetNodeId: string; reason: string }
  | { type: 'UNLOCK_NEXT_NODE'; targetNodeId: string; reason: string }
  | { type: 'HOLD_FOR_SAFETY'; reason: string }
  | { type: 'REQUIRE_VIDEO_CONFIRMATION'; reason: string }
  | { type: 'REQUIRE_COACH_CONFIRMATION'; reason: string }
  | { type: 'DELOAD_SKILL'; reason: string }
  | { type: 'STOP_BLOCK_DUE_TO_QUALITY_DROP'; reason: string };

export interface WeightedCalisthenicsEntry {
  bodyweightKg: number;
  externalLoadKg: number;
  assistanceLoadKg: number;
  loadPlacement: string;
  repetitions?: number;
  holdSeconds?: number;
}

export interface VolumeEntry {
  muscleId: string;
  directSets: number;
  estimatedEffectiveSets: number;
  staticExposureSeconds: number;
  techniqueSets: number;
  powerSets: number;
}

export interface ReplacementInput {
  userId: string;
  gymExercise: Exercise;
  calisthenicsNode: SkillNode;
  currentSkillAttempts: SkillAttempt[];
  equipmentAvailable: string[];
  weeklyVolumeForMuscle: VolumeEntry;
  sessionTimeMinutes: number;
  painFree: boolean;
}

export type ReplacementPercentage = 0 | 25 | 50 | 75 | 100;

export interface ReplacementDecision {
  allowed: boolean;
  percentage: ReplacementPercentage;
  reason: string;
  conditions: string[];
}

export type MovementPattern =
  | 'VERTICAL_PUSH'
  | 'VERTICAL_PULL'
  | 'HORIZONTAL_PUSH'
  | 'HORIZONTAL_PULL'
  | 'KNEE_DOMINANT'
  | 'HIP_HINGE'
  | 'KNEE_FLEXION'
  | 'CALF'
  | 'CORE_COMPRESSION'
  | 'GRIP'
  | 'LOWER_BODY_POWER'
  | 'UPPER_BODY_POWER';

export interface MovementPatternReadiness {
  pattern: MovementPattern;
  equipmentReady: boolean;
  performanceReady: boolean;
  volumeReady: boolean;
  timeReady: boolean;
  painFree: boolean;
  supportingExerciseOrSkill: string;
  blockers: string[];
  recommendation: string;
}

export type GraduationTemplate = 'PRACTICAL_HOME_INDEPENDENCE' | 'ADVANCED_CALISTHENICS_GRADUATION' | 'ELITE_MASTERY';

export interface GraduationRequirement {
  type: 'SKILL_UNLOCKED' | 'SKILL_MASTERED' | 'MOVEMENT_PATTERN_READY' | 'CUSTOM';
  targetSkillNodeId?: string;
  targetMovementPattern?: MovementPattern;
  targetMetric?: string;
}

export interface GraduationContract {
  id: string;
  userId: string;
  template: GraduationTemplate;
  requirements: GraduationRequirement[];
  status: 'active' | 'completed';
  completedAt?: Date;
}

export interface GraduationDecision {
  complete: boolean;
  progressPercent: number;
  remainingRequirements: GraduationRequirement[];
  satisfiedRequirements: GraduationRequirement[];
  fourWeekTransition?: {
    week1: { gymPercent: number; homePercent: number };
    week2: { gymPercent: number; homePercent: number };
    week3: { gymPercent: number; homePercent: number };
    week4: { gymPercent: number; homePercent: number };
  };
  reason: string;
}

export interface TimeBudgetInput {
  blocks: TimeBlock[];
  availableMinutes: number;
}

export interface TimeBlock {
  id: string;
  orderClass: SessionOrderClass;
  tier: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  minRestSeconds: number;
  exercises: string[];
  required?: boolean;
}

export interface TimeBudgetDecision {
  fits: boolean;
  totalMinutes: number;
  removedBlocks: TimeBlock[];
  warnings: string[];
}

export interface DeloadInput {
  regressingExercises: number;
  failedSets: number;
  skillQualityDeclining: boolean;
  jointIrritation: boolean;
  readinessLow: boolean;
  setAdditionFatigue: boolean;
  userRequested: boolean;
  straightArmToleranceDecline: boolean;
}

export interface DeloadDecision {
  deload: boolean;
  durationDays: number;
  loadReductionPercent: number;
  setReductionPercent: number;
  reason: string;
}

export interface SetAdditionInput {
  exerciseOrSkillId: string;
  phaseWeeks: number;
  exposuresSinceProgress: number;
  effortAppropriate: boolean;
  formAcceptable: boolean;
  sorenessNormal: boolean;
  painFree: boolean;
  adherencePercent: number;
  sessionWithinTime: boolean;
  broadFatigue: boolean;
  atVolumeCap: boolean;
  weeksSinceLastAddition: number;
}

export interface SetAdditionDecision {
  addSet: boolean;
  reason: string;
}
