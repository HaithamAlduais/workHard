import type {
  MovementPattern,
  MovementPatternReadiness,
  SkillAttempt,
  SkillNode,
  SkillUnlockState,
  VolumeEntry
} from '../types.js';
import { getExerciseById } from '../exercises/catalog.js';
import { getSkillNode, getNodesByFamily } from '../skills/graph.js';

export interface ReadinessInput {
  equipmentOwned: string[];
  unlockStates: Map<string, SkillUnlockState>;
  skillAttempts: SkillAttempt[];
  weeklyVolumeByMuscle: Record<string, VolumeEntry>;
  painFlaggedExerciseIds: string[];
  sessionTimeMinutes: number;
}

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  'VERTICAL_PUSH',
  'VERTICAL_PULL',
  'HORIZONTAL_PUSH',
  'HORIZONTAL_PULL',
  'KNEE_DOMINANT',
  'HIP_HINGE',
  'KNEE_FLEXION',
  'CALF',
  'CORE_COMPRESSION',
  'GRIP',
  'UPPER_BODY_POWER',
  'LOWER_BODY_POWER'
];

const VOLUME_THRESHOLD = 6;
const SESSION_TIME_LIMIT = 55;
const RECENT_DAYS = 30;

export interface EquipmentRequirement {
  /** Every listed item must be owned. */
  allOf?: string[];
  /** At least one listed item must be owned. */
  anyOf?: string[];
  /** At least one nested requirement must be satisfied (grouped alternatives). */
  groups?: EquipmentRequirement[];
}

export function evaluateEquipmentRequirement(
  owned: string[],
  requirement: EquipmentRequirement
): { satisfied: boolean; missing: string[] } {
  const missing: string[] = [];

  if (requirement.allOf && requirement.allOf.length > 0) {
    const notOwned = requirement.allOf.filter((item) => !owned.includes(item));
    if (notOwned.length > 0) {
      missing.push(`all of ${notOwned.join(', ')}`);
    }
  }

  if (requirement.anyOf && requirement.anyOf.length > 0) {
    if (!requirement.anyOf.some((item) => owned.includes(item))) {
      missing.push(`one of ${requirement.anyOf.join(', ')}`);
    }
  }

  if (requirement.groups && requirement.groups.length > 0) {
    const groupResults = requirement.groups.map((group) => evaluateEquipmentRequirement(owned, group));
    if (!groupResults.some((g) => g.satisfied)) {
      const groupMissing = groupResults.map((g) => g.missing.join(' and ')).filter(Boolean);
      missing.push(`(${groupMissing.join(') or (')})`);
    }
  }

  return { satisfied: missing.length === 0, missing };
}

interface PatternRule {
  equipment: EquipmentRequirement;
  volumeMuscle: string;
  anchorFamilies?: string[];
  anchorNodes?: string[];
  anchorExercises?: string[];
  performanceNodeMinStage?: number;
}

const PATTERN_RULES: Record<MovementPattern, PatternRule> = {
  VERTICAL_PULL: {
    equipment: {
      groups: [
        { allOf: ['pull-up-bar'] },
        { allOf: ['pull-up-bar', 'dip-belt', 'plates'] },
        { allOf: ['pull-up-bar', 'weight-vest'] }
      ]
    },
    volumeMuscle: 'lats',
    anchorFamilies: ['pull-up'],
    performanceNodeMinStage: 6 // strict-pull-up and beyond
  },
  VERTICAL_PUSH: {
    equipment: { groups: [{ allOf: ['wall'] }, { allOf: ['parallettes'] }] },
    volumeMuscle: 'anterior-deltoids',
    anchorFamilies: ['handstand'],
    performanceNodeMinStage: 5 // wall-hspu and beyond
  },
  HORIZONTAL_PUSH: {
    equipment: {
      groups: [
        { allOf: ['rings'] },
        { allOf: ['rings', 'weight-vest'] },
        { allOf: ['rings', 'backpack'] },
        { allOf: ['rings', 'plates'] }
      ]
    },
    volumeMuscle: 'chest',
    anchorFamilies: ['ring-push-up', 'planche'],
    performanceNodeMinStage: 4 // ring-push-up and beyond
  },
  HORIZONTAL_PULL: {
    equipment: { groups: [{ allOf: ['pull-up-bar'] }, { allOf: ['rings'] }] },
    volumeMuscle: 'upper-back',
    anchorFamilies: ['front-lever'],
    performanceNodeMinStage: 1 // tuck-front-lever and beyond
  },
  KNEE_DOMINANT: {
    equipment: { anyOf: ['box', 'bench', 'step'] },
    volumeMuscle: 'quadriceps',
    anchorFamilies: ['pistol'],
    performanceNodeMinStage: 4 // box-pistol and beyond
  },
  KNEE_FLEXION: {
    equipment: { anyOf: ['nordic-anchor', 'sliders', 'rings'] },
    volumeMuscle: 'hamstrings',
    anchorFamilies: ['knee-flexion'],
    performanceNodeMinStage: 1 // sliding-hamstring-curl and beyond
  },
  HIP_HINGE: {
    // No dedicated calisthenics hip-hinge progression. Home-ready if a loadable
    // implement exists and the user has RDL/deadlift volume.
    equipment: { anyOf: ['barbell', 'dumbbells', 'plates', 'backpack', 'kettlebell'] },
    volumeMuscle: 'hamstrings',
    anchorExercises: ['romanian-deadlift', 'trap-bar-deadlift']
  },
  CALF: {
    equipment: { anyOf: ['box', 'bench', 'step'] },
    volumeMuscle: 'calves',
    anchorExercises: ['single-leg-calf-raise']
  },
  CORE_COMPRESSION: {
    equipment: { anyOf: ['exercise-mat', 'parallettes', 'floor-space'] },
    volumeMuscle: 'trunk',
    anchorFamilies: ['l-sit'],
    performanceNodeMinStage: 3 // one-leg-l-sit and beyond
  },
  GRIP: {
    equipment: { anyOf: ['pull-up-bar', 'plates', 'dumbbells'] },
    volumeMuscle: 'grip',
    anchorExercises: ['towel-dead-hang', 'plate-pinch', 'farmers-carry']
  },
  UPPER_BODY_POWER: {
    equipment: { anyOf: ['medicine-ball', 'park', 'open-space'] },
    volumeMuscle: 'chest',
    anchorExercises: ['medicine-ball-throw']
  },
  LOWER_BODY_POWER: {
    equipment: { anyOf: ['box', 'park', 'open-space'] },
    volumeMuscle: 'quadriceps',
    anchorExercises: ['box-jump', 'trap-bar-jump']
  }
};

function hasEquipment(owned: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.every((item) => owned.includes(item));
}

function isRecent(date: Date): boolean {
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}

function countQualityAttempts(node: SkillNode, attempts: SkillAttempt[]): number {
  return attempts.filter((a) => {
    if (a.skillNodeId !== node.id) return false;
    if (!isRecent(a.completedAt)) return false;
    if (a.painLevel > 0) return false;
    if (a.qualityScore < node.targetQuality) return false;
    if (node.staticOrDynamic === 'static') {
      return (a.validHoldSeconds ?? 0) >= (node.targetDose.holdSecondsMin ?? 0);
    }
    return (a.repetitions ?? 0) >= (node.targetDose.repsMin ?? 1);
  }).length;
}

interface SkillAnchor {
  nodeId: string;
  name: string;
  ready: boolean;
  equipmentSatisfied: boolean;
}

function findSkillAnchors(rule: PatternRule, input: ReadinessInput): SkillAnchor[] {
  const owned = input.equipmentOwned;
  const nodes: SkillNode[] = [];

  if (rule.anchorFamilies) {
    for (const familyId of rule.anchorFamilies) {
      nodes.push(...getNodesByFamily(familyId));
    }
  }
  if (rule.anchorNodes) {
    for (const id of rule.anchorNodes) {
      const node = getSkillNode(id);
      if (node) nodes.push(node);
    }
  }

  const minStage = rule.performanceNodeMinStage ?? 1;
  const anchors: SkillAnchor[] = [];

  for (const node of nodes) {
    if (node.stage < minStage) continue;
    const state = input.unlockStates.get(node.id);
    const unlocked = state?.status === 'unlocked' || state?.status === 'mastered';
    if (!unlocked) continue;
    const equipmentSatisfied = hasEquipment(owned, node.apparatus);
    const qualityCount = countQualityAttempts(node, input.skillAttempts);
    anchors.push({ nodeId: node.id, name: node.name, ready: equipmentSatisfied && qualityCount >= 2, equipmentSatisfied });
  }

  return anchors;
}

function findSkillAnchor(rule: PatternRule, input: ReadinessInput): SkillAnchor | undefined {
  const anchors = findSkillAnchors(rule, input);
  return anchors.find((a) => a.ready) ?? anchors[0];
}

interface ExerciseAnchor {
  exerciseId: string;
  name: string;
  ready: boolean;
  equipmentSatisfied: boolean;
}

function findExerciseAnchors(rule: PatternRule, input: ReadinessInput): ExerciseAnchor[] {
  const owned = input.equipmentOwned;
  const anchors: ExerciseAnchor[] = [];
  for (const id of rule.anchorExercises ?? []) {
    const ex = getExerciseById(id);
    if (!ex) continue;
    const equipmentSatisfied = hasEquipment(owned, ex.equipmentIds);
    const volume = input.weeklyVolumeByMuscle[ex.primaryMuscleIds[0] ?? 'unknown'];
    const hasVolume = (volume?.directSets ?? 0) >= VOLUME_THRESHOLD;
    anchors.push({ exerciseId: id, name: ex.name, ready: equipmentSatisfied && hasVolume, equipmentSatisfied });
  }
  return anchors;
}

function findExerciseAnchor(rule: PatternRule, input: ReadinessInput): ExerciseAnchor | undefined {
  const anchors = findExerciseAnchors(rule, input);
  return anchors.find((a) => a.ready) ?? anchors[0];
}

function evaluatePattern(pattern: MovementPattern, input: ReadinessInput): MovementPatternReadiness {
  const rule = PATTERN_RULES[pattern];
  const blockers: string[] = [];

  const skillAnchors = findSkillAnchors(rule, input);
  const exerciseAnchors = findExerciseAnchors(rule, input);
  const hasEquippedSkillAnchor = skillAnchors.some((a) => a.equipmentSatisfied);
  const hasEquippedExerciseAnchor = exerciseAnchors.some((a) => a.equipmentSatisfied);
  const equipmentReady = hasEquippedSkillAnchor || hasEquippedExerciseAnchor;

  if (!equipmentReady) {
    const equipmentEval = evaluateEquipmentRequirement(input.equipmentOwned, rule.equipment);
    if (!equipmentEval.satisfied) {
      blockers.push(`Missing equipment: ${equipmentEval.missing.join('; ')}`);
    } else {
      blockers.push('No unlocked anchor has the required equipment available.');
    }
  }

  const skillAnchor = findSkillAnchor(rule, input);
  const exerciseAnchor = !skillAnchor ? findExerciseAnchor(rule, input) : undefined;
  const anchor = skillAnchor ?? exerciseAnchor;

  let performanceReady = false;
  let supportingExerciseOrSkill = '';

  if (skillAnchor?.ready) {
    performanceReady = true;
    supportingExerciseOrSkill = skillAnchor.name;
  } else if (exerciseAnchor?.ready) {
    performanceReady = true;
    supportingExerciseOrSkill = exerciseAnchor.name;
  } else {
    if (anchor) {
      supportingExerciseOrSkill = anchor.name;
      blockers.push(`${anchor.name} is unlocked but not yet consistent enough (need 2 quality exposures in the last 30 days).`);
    } else {
      blockers.push('No supporting skill or exercise is unlocked.');
    }
  }

  const volume = input.weeklyVolumeByMuscle[rule.volumeMuscle];
  const volumeReady = (volume?.directSets ?? 0) >= VOLUME_THRESHOLD;
  if (!volumeReady) {
    blockers.push(`Weekly volume for ${rule.volumeMuscle} is below ${VOLUME_THRESHOLD} direct sets.`);
  }

  const timeReady = input.sessionTimeMinutes <= SESSION_TIME_LIMIT;
  if (!timeReady) {
    blockers.push(`Session estimate (${input.sessionTimeMinutes} min) exceeds ${SESSION_TIME_LIMIT} min.`);
  }

  const anchorIds = [
    ...(rule.anchorFamilies?.flatMap((f) => getNodesByFamily(f).map((n) => n.id)) ?? []),
    ...(rule.anchorExercises ?? [])
  ];
  const painFlagged = input.painFlaggedExerciseIds.some((id) => anchorIds.includes(id));
  if (painFlagged) {
    blockers.push('Pain reported for a relevant exercise or skill.');
  }

  const homeReady = equipmentReady && performanceReady && volumeReady && timeReady && !painFlagged;

  return {
    pattern,
    equipmentReady,
    performanceReady,
    volumeReady,
    timeReady,
    painFree: !painFlagged,
    supportingExerciseOrSkill,
    blockers,
    recommendation: homeReady
      ? `${pattern.replace(/_/g, ' ')} is home-ready.`
      : `Blocked: ${blockers.slice(0, 2).join('; ')}${blockers.length > 2 ? '...' : ''}`
  };
}

export function evaluateMovementPatternReadiness(
  input: ReadinessInput
): Map<string, MovementPatternReadiness> {
  const result = new Map<string, MovementPatternReadiness>();
  for (const pattern of MOVEMENT_PATTERNS) {
    result.set(pattern, evaluatePattern(pattern, input));
  }
  return result;
}

export function getHomeReadinessPercent(readiness: Map<string, MovementPatternReadiness>): number {
  let ready = 0;
  for (const r of readiness.values()) {
    if (r.equipmentReady && r.performanceReady && r.volumeReady && r.timeReady && r.painFree) {
      ready++;
    }
  }
  return Math.round((ready / MOVEMENT_PATTERNS.length) * 100);
}

export function getTopBlockers(
  readiness: Map<string, MovementPatternReadiness>,
  limit = 3
): string[] {
  const blockers: string[] = [];
  for (const r of readiness.values()) {
    if (r.blockers.length > 0) {
      blockers.push(`${r.pattern}: ${r.blockers[0]}`);
    }
    if (blockers.length >= limit) break;
  }
  return blockers.slice(0, limit);
}
