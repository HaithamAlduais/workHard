import { getSkillNode, type SkillNode, type SkillUnlockState } from '@gravitypath/domain';

export interface PriorityInfo {
  primarySkillFamilyId: string;
  secondarySkillFamilyIds: string[];
  inactiveSkillFamilyIds: string[];
}

export function familyPriorityStatus(familyId: string, priority: PriorityInfo): string {
  if (priority.primarySkillFamilyId === familyId) return 'active_primary';
  if (priority.secondarySkillFamilyIds.includes(familyId)) return 'active_secondary';
  if (priority.inactiveSkillFamilyIds.includes(familyId)) return 'inactive';
  return 'maintenance';
}

export function missingPrerequisites(node: SkillNode, unlockStates: Map<string, SkillUnlockState>): string[] {
  return node.prerequisites.filter((id) => {
    const state = unlockStates.get(id);
    return !state || (state.status !== 'unlocked' && state.status !== 'mastered');
  });
}

export function prerequisiteName(id: string): string {
  return getSkillNode(id)?.name ?? id;
}
