import { describe, it, expect } from 'vitest';
import { familyPriorityStatus, missingPrerequisites } from '../lib/skillTree';
import { getSkillNode } from '@gravitypath/domain';

describe('skill-tree helpers', () => {
  it('identifies active primary family', () => {
    const status = familyPriorityStatus('handstand', {
      primarySkillFamilyId: 'handstand',
      secondarySkillFamilyIds: ['pull-up'],
      inactiveSkillFamilyIds: []
    });
    expect(status).toBe('active_primary');
  });

  it('identifies inactive family', () => {
    const status = familyPriorityStatus('planche', {
      primarySkillFamilyId: 'handstand',
      secondarySkillFamilyIds: ['pull-up'],
      inactiveSkillFamilyIds: ['planche']
    });
    expect(status).toBe('inactive');
  });

  it('lists missing prerequisites for a locked node', () => {
    const node = getSkillNode('weighted-pull-up')!;
    const unlockStates = new Map();
    expect(missingPrerequisites(node, unlockStates)).toContain('strict-pull-up');
  });

  it('returns no missing prerequisites when prerequisite is mastered', () => {
    const node = getSkillNode('weighted-pull-up')!;
    const unlockStates = new Map([
      ['strict-pull-up', { nodeId: 'strict-pull-up', status: 'mastered' as const, reason: '' }]
    ]);
    expect(missingPrerequisites(node, unlockStates)).toEqual([]);
  });
});
