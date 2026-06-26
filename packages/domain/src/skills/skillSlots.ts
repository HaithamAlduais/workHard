import type { SessionOrderClass, PairType, SkillNode, SkillUnlockState } from '../types.js';
import type { SkillPrescription, SkillPrescriptionStatus } from '../prescriptions/types.js';
import { getSkillNode, getNodesByFamily } from './graph.js';

export type { SkillPrescriptionStatus };

export interface SkillPriority {
  primarySkillFamilyId: string;
  secondarySkillFamilyIds: string[];
  maintenanceSkillFamilyIds: string[];
  inactiveSkillFamilyIds: string[];
  goalTemplate: 'practical_home' | 'advanced_calisthenics' | 'elite_mastery';
  blockStart: string | null;
  blockEnd: string | null;
  blockLengthWeeks: number;
}

export interface SkillSlot {
  id: string;
  exerciseId: string;
  name: string;
  nameAr: string;
  familyId: string;
  orderClass: SessionOrderClass;
  pairId?: string;
  pairType?: PairType;
  role: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetHoldSeconds?: number;
  restSeconds: number;
  reason: string;
  status: 'active_primary' | 'active_secondary' | 'maintenance';
}

export interface SkillConflictWarning {
  type: string;
  severity: 'warning' | 'danger';
  message: string;
}

export interface GenerateSkillSlotsOptions {
  priority: SkillPriority;
  skillPrescriptions: Record<string, SkillPrescription>;
  unlockStates: Map<string, SkillUnlockState>;
  startingNodes?: Record<string, string>;
  equipment?: string[];
  painFlags?: { elbows?: boolean; shoulders?: boolean; lowerBack?: boolean };
}

const DAY_PRIMARY_CATEGORIES: Record<string, string[]> = {
  day1: ['handstand', 'planche', 'ring-push-up'],
  day2: ['muscle-up', 'pull-up'],
  day3: ['front-lever', 'back-lever', 'l-sit', 'pistol']
};

const SECONDARY_EXPOSURE_DAY: Record<string, string | null> = {
  handstand: 'day3',
  planche: 'day3',
  'ring-push-up': 'day3',
  'muscle-up': 'day1',
  'pull-up': 'day1',
  'front-lever': 'day1',
  'back-lever': 'day1',
  'l-sit': 'day1',
  pistol: null
};

const DEFAULT_FAMILY_FOR_DAY: Record<string, string> = {
  day1: 'handstand',
  day2: 'pull-up',
  day3: 'front-lever'
};

const STRAIGHT_ARM_PUSH_FAMILIES = new Set(['handstand', 'planche', 'ring-push-up']);
const STRAIGHT_ARM_PULL_FAMILIES = new Set(['front-lever', 'back-lever']);

function isActiveStatus(status?: SkillPrescriptionStatus): boolean {
  return status === 'active_primary' || status === 'active_secondary' || status === 'maintenance';
}

export function validateSkillPriority(priority: SkillPriority): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!priority.primarySkillFamilyId) {
    errors.push('Select a primary skill.');
  }
  if (priority.secondarySkillFamilyIds.length > 2) {
    errors.push('You can select up to two secondary skills.');
  }
  if (priority.secondarySkillFamilyIds.includes(priority.primarySkillFamilyId)) {
    errors.push('Primary skill cannot also be a secondary skill.');
  }
  const all = [
    priority.primarySkillFamilyId,
    ...priority.secondarySkillFamilyIds,
    ...priority.maintenanceSkillFamilyIds,
    ...priority.inactiveSkillFamilyIds
  ];
  const seen = new Set<string>();
  for (const familyId of all) {
    if (!familyId) continue;
    if (seen.has(familyId)) {
      errors.push(`Skill family ${familyId} can only be in one priority category.`);
      break;
    }
    seen.add(familyId);
  }
  return { valid: errors.length === 0, errors };
}

export function checkSkillPriorityConflicts(
  priority: SkillPriority,
  skillPrescriptions: Record<string, SkillPrescription>,
  unlockStates?: Map<string, SkillUnlockState>
): SkillConflictWarning[] {
  const warnings: SkillConflictWarning[] = [];
  const activeFamilies = [priority.primarySkillFamilyId, ...priority.secondarySkillFamilyIds];

  const straightArmPushCount = activeFamilies.filter((f) => STRAIGHT_ARM_PUSH_FAMILIES.has(f)).length;
  const straightArmPullCount = activeFamilies.filter((f) => STRAIGHT_ARM_PULL_FAMILIES.has(f)).length;

  if (straightArmPushCount > 1) {
    warnings.push({
      type: 'redundant_straight_arm_push',
      severity: 'warning',
      message: 'Multiple straight-arm push priorities increase elbow and wrist stress.'
    });
  }

  if (straightArmPullCount > 1) {
    warnings.push({
      type: 'redundant_straight_arm_pull',
      severity: 'warning',
      message: 'Multiple straight-arm pull priorities increase elbow and shoulder stress.'
    });
  }

  if (
    STRAIGHT_ARM_PUSH_FAMILIES.has(priority.primarySkillFamilyId) &&
    activeFamilies.some((f) => STRAIGHT_ARM_PULL_FAMILIES.has(f))
  ) {
    warnings.push({
      type: 'high_straight_arm_load',
      severity: 'warning',
      message: 'Combining straight-arm push and pull priorities creates high total straight-arm demand.'
    });
  }

  if (priority.primarySkillFamilyId === 'expert-rings') {
    const required = ['full-planche', 'full-front-lever'];
    const missing = required.filter((nodeId) => {
      const state = unlockStates?.get(nodeId);
      return !state || (state.status !== 'unlocked' && state.status !== 'mastered');
    });
    if (missing.length > 0) {
      warnings.push({
        type: 'expert_prerequisites_missing',
        severity: 'danger',
        message: `Expert rings requires ${missing.join(', ')} to be unlocked first.`
      });
    }
  }

  const primaryHead = Object.values(skillPrescriptions).find(
    (p) => p.skill_family_id === priority.primarySkillFamilyId && p.currentNode === p.skill_node_id
  );
  if (primaryHead) {
    const node = getSkillNode(primaryHead.currentNode);
    if (node && (node.riskLevel === 'high' || node.riskLevel === 'expert')) {
      warnings.push({
        type: 'high_risk_primary',
        severity: 'warning',
        message: `${node.name} is a high-risk skill. Prioritize recovery and form quality.`
      });
    }
  }

  if (priority.secondarySkillFamilyIds.includes('expert-rings')) {
    warnings.push({
      type: 'expert_as_secondary',
      severity: 'warning',
      message: 'Expert ring branches are not recommended as a secondary focus.'
    });
  }

  return warnings;
}

export function updateSkillPrescriptionStatuses(
  priority: SkillPriority,
  skillPrescriptions: Record<string, SkillPrescription>,
  unlockStates: Map<string, SkillUnlockState>
): Record<string, SkillPrescriptionStatus> {
  const result: Record<string, SkillPrescriptionStatus> = {};

  for (const prescription of Object.values(skillPrescriptions)) {
    let status: SkillPrescriptionStatus = 'maintenance';

    if (prescription.skill_family_id === priority.primarySkillFamilyId) {
      status = 'active_primary';
    } else if (priority.secondarySkillFamilyIds.includes(prescription.skill_family_id)) {
      status = 'active_secondary';
    } else if (priority.inactiveSkillFamilyIds.includes(prescription.skill_family_id)) {
      status = 'inactive';
    }

    if (prescription.activeSafetyHold) {
      status = 'safety_hold';
    } else {
      const unlock = unlockStates.get(prescription.skill_node_id);
      if (unlock?.status === 'safety_hold') {
        status = 'safety_hold';
      } else if (unlock?.status === 'locked' && status !== 'inactive') {
        status = 'locked';
      }
    }

    result[prescription.skill_node_id] = status;
  }

  return result;
}

function orderClassForSkillSlot(familyId: string, dayId: string): SessionOrderClass {
  if (familyId === 'handstand' || familyId === 'planche') return 'TECHNIQUE_FIRST';
  if (familyId === 'ring-push-up') return dayId === 'day2' ? 'HYPERTROPHY_SKILL' : 'STRENGTH_SKILL';
  return 'STRENGTH_SKILL';
}

function slotStatusFromPrescription(
  status: SkillPrescription['status']
): SkillSlot['status'] {
  if (status === 'active_primary') return 'active_primary';
  if (status === 'active_secondary') return 'active_secondary';
  return 'maintenance';
}

function findTrainingNodeForFamily(
  familyId: string,
  skillPrescriptions: Record<string, SkillPrescription>,
  unlockStates: Map<string, SkillUnlockState>,
  startingNodes?: Record<string, string>
): { node: SkillNode; status: SkillSlot['status']; prescription?: SkillPrescription } | undefined {
  const familyPrescriptions = Object.values(skillPrescriptions).filter(
    (p) => p.skill_family_id === familyId
  );

  // If the user explicitly selected a starting node via calibration, prefer it.
  const explicitStartingNodeId = startingNodes
    ? Object.entries(startingNodes)
        .filter(([nodeId, startId]) => nodeId === startId)
        .map(([nodeId]) => nodeId)
        .find((nodeId) => familyPrescriptions.some((p) => p.skill_node_id === nodeId))
    : undefined;

  if (explicitStartingNodeId) {
    const prescription = familyPrescriptions.find((p) => p.skill_node_id === explicitStartingNodeId);
    const node = prescription ? getSkillNode(prescription.currentNode) : undefined;
    if (prescription && node && prescription.status !== 'inactive' && prescription.status !== 'safety_hold') {
      return { node, status: slotStatusFromPrescription(prescription.status), prescription };
    }
  }

  const activeHead = familyPrescriptions.find(
    (p) => isActiveStatus(p.status) && p.currentNode === p.skill_node_id
  );
  const activeAny = familyPrescriptions.find((p) => isActiveStatus(p.status));

  const prescription = activeHead ?? activeAny;

  if (prescription) {
    const node = getSkillNode(prescription.currentNode);
    if (node) {
      return { node, status: slotStatusFromPrescription(prescription.status), prescription };
    }
  }

  const nodes = getNodesByFamily(familyId);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const state = unlockStates.get(nodes[i].id);
    if (state && state.status !== 'locked' && state.status !== 'safety_hold') {
      return { node: nodes[i], status: 'maintenance' };
    }
  }

  if (nodes.length > 0) {
    return { node: nodes[0], status: 'maintenance' };
  }

  return undefined;
}

function buildSlotForNode(
  node: SkillNode,
  familyId: string,
  dayId: string,
  status: SkillSlot['status'],
  reason: string,
  prescription?: SkillPrescription
): SkillSlot {
  const isStatic = node.staticOrDynamic === 'static';
  const baseSets = prescription?.targetSets ?? node.targetDose.sets ?? 1;
  const targetSets = status === 'maintenance' ? Math.max(2, Math.floor(baseSets / 2)) : baseSets;

  let targetHoldSeconds: number | undefined;
  let targetRepsMin: number | undefined;
  let targetRepsMax: number | undefined;

  if (isStatic) {
    targetHoldSeconds = prescription?.targetRepsOrHoldSeconds ?? node.targetDose.holdSecondsMin ?? 0;
  } else {
    targetRepsMin = node.targetDose.repsMin ?? 1;
    targetRepsMax = prescription?.targetRepsOrHoldSeconds ?? node.targetDose.repsMax ?? targetRepsMin;
  }

  return {
    id: `${dayId}-${familyId}-${node.id}`,
    exerciseId: node.id,
    name: node.name,
    nameAr: node.nameAr,
    familyId,
    orderClass: orderClassForSkillSlot(familyId, dayId),
    role: node.role,
    targetSets,
    targetHoldSeconds,
    targetRepsMin,
    targetRepsMax,
    restSeconds: 60,
    reason,
    status
  };
}

export function generateSkillSlotsForDay(
  dayId: string,
  options: GenerateSkillSlotsOptions
): SkillSlot[] {
  const { priority, skillPrescriptions, unlockStates, startingNodes } = options;
  const category = DAY_PRIMARY_CATEGORIES[dayId] ?? [];
  const slots: SkillSlot[] = [];
  const usedFamilies = new Set<string>();

  // Primary slot if primary family belongs to this day's category.
  if (category.includes(priority.primarySkillFamilyId)) {
    const found = findTrainingNodeForFamily(priority.primarySkillFamilyId, skillPrescriptions, unlockStates, startingNodes);
    if (found) {
      slots.push(
        buildSlotForNode(
          found.node,
          priority.primarySkillFamilyId,
          dayId,
          'active_primary',
          `${priority.primarySkillFamilyId} primary on ${dayId}`,
          found.prescription
        )
      );
      usedFamilies.add(priority.primarySkillFamilyId);
    }
  }

  // Secondary slots for secondary families that belong to this day's category.
  for (const familyId of priority.secondarySkillFamilyIds) {
    if (!category.includes(familyId)) continue;
    if (usedFamilies.has(familyId)) continue;
    const found = findTrainingNodeForFamily(familyId, skillPrescriptions, unlockStates, startingNodes);
    if (!found) continue;
    slots.push(
      buildSlotForNode(
        found.node,
        familyId,
        dayId,
        'active_secondary',
        `${familyId} secondary on ${dayId}`,
        found.prescription
      )
    );
    usedFamilies.add(familyId);
  }

  // Maintenance fallback for the day's category if nothing was scheduled.
  if (slots.length === 0) {
    const defaultFamily = DEFAULT_FAMILY_FOR_DAY[dayId];
    if (defaultFamily) {
      const found = findTrainingNodeForFamily(defaultFamily, skillPrescriptions, unlockStates, startingNodes);
      if (found) {
        slots.push(
          buildSlotForNode(
            found.node,
            defaultFamily,
            dayId,
            'maintenance',
            `${defaultFamily} maintenance on ${dayId}`,
            found.prescription
          )
        );
        usedFamilies.add(defaultFamily);
      }
    }
  }

  // Secondary exposure for the primary family if its support day matches today.
  const supportDay = SECONDARY_EXPOSURE_DAY[priority.primarySkillFamilyId];
  if (supportDay === dayId && !usedFamilies.has(priority.primarySkillFamilyId)) {
    const found = findTrainingNodeForFamily(priority.primarySkillFamilyId, skillPrescriptions, unlockStates, startingNodes);
    if (found) {
      slots.push(
        buildSlotForNode(
          found.node,
          priority.primarySkillFamilyId,
          dayId,
          'maintenance',
          `${priority.primarySkillFamilyId} maintenance exposure on ${dayId}`,
          found.prescription
        )
      );
    }
  }

  return slots.slice(0, 2);
}
