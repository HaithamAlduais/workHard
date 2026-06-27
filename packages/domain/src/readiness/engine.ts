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

const MOVEMENT_PATTERNS: MovementPattern[] = [
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

interface PatternRule {
  requiredEquipment: string[];
  volumeMuscle: string;
  anchorFamilies?: string[];
  anchorNodes?: string[];
  anchorExercises?: string[];
  performanceNodeMinStage?: number;
}

const PATTERN_RULES: Record<MovementPattern, PatternRule> = {
  VERTICAL_PULL: {
    requiredEquipment: ['pull-up-bar'],
    volumeMuscle: 'lats',
    anchorFamilies: ['pull-up'],
    performanceNodeMinStage: 6 // strict-pull-up and beyond
  },
  VERTICAL_PUSH: {
    requiredEquipment: ['wall'],
    volumeMuscle: 'anterior-deltoids',
    anchorFamilies: ['handstand'],
    performanceNodeMinStage: 5 // wall-hspu and beyond
  },
  HORIZONTAL_PUSH: {
    requiredEquipment: ['rings'],
    volumeMuscle: 'chest',
    anchorFamilies: ['ring-push-up', 'planche'],
    performanceNodeMinStage: 4 // ring-push-up and beyond
  },
  HORIZONTAL_PULL: {
    requiredEquipment: ['pull-up-bar'],
    volumeMuscle: 'upper-back',
    anchorFamilies: ['front-lever'],
    performanceNodeMinStage: 1 // tuck-front-lever and beyond; dynamic rows come later
  },
  KNEE_DOMINANT: {
    requiredEquipment: ['box'],
    volumeMuscle: 'quadriceps',
    anchorFamilies: ['pistol'],
    performanceNodeMinStage: 4 // box-pistol and beyond
  },
  KNEE_FLEXION: {
    requiredEquipment: ['nordic-anchor', 'sliders', 'rings'], // any one of these
    volumeMuscle: 'hamstrings',
    anchorFamilies: ['knee-flexion'],
    performanceNodeMinStage: 2 // ring-hamstring-curl and beyond
  },
  HIP_HINGE: {
    // No dedicated calisthenics hip-hinge progression. Home-ready if a loadable
    // implement exists and the user has RDL/deadlift volume.
    requiredEquipment: ['barbell', 'dumbbells', 'plates', 'backpack'],
    volumeMuscle: 'hamstrings',
    anchorExercises: ['romanian-deadlift', 'trap-bar-deadlift']
  },
  CALF: {
    requiredEquipment: ['box'],
    volumeMuscle: 'calves',
    anchorExercises: ['single-leg-calf-raise']
  },
  CORE_COMPRESSION: {
    requiredEquipment: ['exercise-mat'],
    volumeMuscle: 'trunk',
    anchorFamilies: ['l-sit'],
    performanceNodeMinStage: 3 // one-leg-l-sit and beyond
  },
  GRIP: {
    requiredEquipment: ['pull-up-bar', 'plates', 'dumbbells'],
    volumeMuscle: 'grip',
    anchorExercises: ['towel-dead-hang', 'plate-pinch', 'farmers-carry']
  },
  UPPER_BODY_POWER: {
    requiredEquipment: ['medicine-ball', 'park'],
    volumeMuscle: 'chest',
    anchorExercises: ['medicine-ball-throw']
  },
  LOWER_BODY_POWER: {
    requiredEquipment: ['box', 'park'],
    volumeMuscle: 'quadriceps',
    anchorExercises: ['box-jump', 'trap-bar-jump']
  }
};

function hasEquipment(owned: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((item) => owned.includes(item));
}

function missingEquipment(owned: string[], required: string[]): string[] {
  if (required.length === 0) return [];
  if (required.some((item) => owned.includes(item))) return [];
  return required;
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

function findSkillAnchor(
  rule: PatternRule,
  input: ReadinessInput
): { nodeId: string; name: string; ready: boolean } | undefined {
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

  for (const node of nodes) {
    if (node.stage < minStage) continue;
    const state = input.unlockStates.get(node.id);
    const unlocked = state?.status === 'unlocked' || state?.status === 'mastered';
    if (!unlocked) continue;
    if (!hasEquipment(owned, node.apparatus)) continue;
    const qualityCount = countQualityAttempts(node, input.skillAttempts);
    if (qualityCount >= 2) {
      return { nodeId: node.id, name: node.name, ready: true };
    }
  }

  for (const node of nodes) {
    if (node.stage < minStage) continue;
    const state = input.unlockStates.get(node.id);
    if (state?.status === 'unlocked' || state?.status === 'mastered') {
      return { nodeId: node.id, name: node.name, ready: false };
    }
  }

  return undefined;
}

function findExerciseAnchor(
  rule: PatternRule,
  input: ReadinessInput
): { exerciseId: string; name: string; ready: boolean } | undefined {
  const owned = input.equipmentOwned;
  for (const id of rule.anchorExercises ?? []) {
    const ex = getExerciseById(id);
    if (!ex) continue;
    if (!hasEquipment(owned, ex.equipmentIds)) continue;
    const volume = input.weeklyVolumeByMuscle[ex.primaryMuscleIds[0] ?? 'unknown'];
    const hasVolume = (volume?.directSets ?? 0) >= VOLUME_THRESHOLD;
    return { exerciseId: id, name: ex.name, ready: hasVolume };
  }
  return undefined;
}

function evaluatePattern(pattern: MovementPattern, input: ReadinessInput): MovementPatternReadiness {
  const rule = PATTERN_RULES[pattern];
  const blockers: string[] = [];

  const equipmentMissing = missingEquipment(input.equipmentOwned, rule.requiredEquipment);
  const equipmentReady = equipmentMissing.length === 0;
  if (!equipmentReady) {
    blockers.push(`Missing equipment: ${equipmentMissing.join(' or ')}`);
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
  const all: string[] = [];
  for (const r of readiness.values()) {
    if (!r.equipmentReady || !r.performanceReady || !r.volumeReady || !r.timeReady || !r.painFree) {
      for (const b of r.blockers) {
        all.push(`${r.pattern}: ${b}`);
      }
    }
  }
  return all.slice(0, limit);
}
