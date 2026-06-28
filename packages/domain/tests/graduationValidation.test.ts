import { describe, it, expect } from 'vitest';
import {
  validateContractSelection,
  createPracticalHomeContract,
  createAdvancedCalisthenicsContract,
  createEliteMasteryContract,
  getSkillNode,
  MOVEMENT_PATTERNS
} from '../src/index.js';
import type { GraduationRequirement } from '../src/types.js';

describe('validateContractSelection', () => {
  it('allows Practical Home without prerequisites', () => {
    const result = validateContractSelection('PRACTICAL_HOME_INDEPENDENCE', { completedTemplates: [] });
    expect(result.valid).toBe(true);
  });

  it('blocks Advanced Calisthenics when Practical Home is not completed', () => {
    const result = validateContractSelection('ADVANCED_CALISTHENICS_GRADUATION', { completedTemplates: [] });
    expect(result.valid).toBe(false);
  });

  it('allows Advanced Calisthenics after Practical Home', () => {
    const result = validateContractSelection('ADVANCED_CALISTHENICS_GRADUATION', {
      completedTemplates: ['PRACTICAL_HOME_INDEPENDENCE']
    });
    expect(result.valid).toBe(true);
  });

  it('blocks Elite Mastery when Advanced Calisthenics is not completed', () => {
    const result = validateContractSelection('ELITE_MASTERY', {
      completedTemplates: ['PRACTICAL_HOME_INDEPENDENCE']
    });
    expect(result.valid).toBe(false);
  });

  it('allows Elite Mastery after Advanced Calisthenics', () => {
    const result = validateContractSelection('ELITE_MASTERY', {
      completedTemplates: ['PRACTICAL_HOME_INDEPENDENCE', 'ADVANCED_CALISTHENICS_GRADUATION']
    });
    expect(result.valid).toBe(true);
  });
});

describe('graduation contract requirements', () => {
  function collectRequirements(contract: { requirements: GraduationRequirement[] }) {
    return contract.requirements;
  }

  it('every targetSkillNodeId in every contract exists in the skill graph', () => {
    const contracts = [
      createPracticalHomeContract('u'),
      createAdvancedCalisthenicsContract('u'),
      createEliteMasteryContract('u')
    ];
    for (const contract of contracts) {
      for (const req of contract.requirements) {
        if (req.targetSkillNodeId) {
          expect(getSkillNode(req.targetSkillNodeId)).toBeDefined();
        }
      }
    }
  });

  it('every targetMovementPattern is a known movement pattern', () => {
    const contracts = [
      createPracticalHomeContract('u'),
      createAdvancedCalisthenicsContract('u'),
      createEliteMasteryContract('u')
    ];
    for (const contract of contracts) {
      for (const req of contract.requirements) {
        if (req.targetMovementPattern) {
          expect(MOVEMENT_PATTERNS).toContain(req.targetMovementPattern);
        }
      }
    }
  });

  it('has no duplicate requirements within a contract', () => {
    const contracts = [
      createPracticalHomeContract('u'),
      createAdvancedCalisthenicsContract('u'),
      createEliteMasteryContract('u')
    ];
    for (const contract of contracts) {
      const seen = new Set<string>();
      for (const req of contract.requirements) {
        const key = req.type + '|' + (req.targetSkillNodeId ?? req.targetMovementPattern ?? '');
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('produces non-empty requirements for every template', () => {
    expect(createPracticalHomeContract('u').requirements.length).toBeGreaterThan(0);
    expect(createAdvancedCalisthenicsContract('u').requirements.length).toBeGreaterThan(0);
    expect(createEliteMasteryContract('u').requirements.length).toBeGreaterThan(0);
  });
});
