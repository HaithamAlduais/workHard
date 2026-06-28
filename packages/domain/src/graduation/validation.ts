import type { GraduationTemplate } from '../types.js';

export interface ContractValidationOptions {
  completedTemplates: GraduationTemplate[];
  ownedEquipmentIds?: string[];
}

export interface ContractValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateContractSelection(
  template: GraduationTemplate,
  options: ContractValidationOptions
): ContractValidationResult {
  const { completedTemplates } = options;

  if (template === 'ELITE_MASTERY' && !completedTemplates.includes('ADVANCED_CALISTHENICS_GRADUATION')) {
    return {
      valid: false,
      reason: 'Elite Mastery requires the Advanced Calisthenics contract to be completed first.'
    };
  }

  if (template === 'ADVANCED_CALISTHENICS_GRADUATION' && !completedTemplates.includes('PRACTICAL_HOME_INDEPENDENCE')) {
    return {
      valid: false,
      reason: 'Advanced Calisthenics is much more realistic after completing Practical Home Independence.'
    };
  }

  return { valid: true };
}
