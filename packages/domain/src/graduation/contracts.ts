import type { GraduationContract, GraduationRequirement, GraduationTemplate, MovementPattern } from '../types.js';

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

function movementPatternRequirements(): GraduationRequirement[] {
  return MOVEMENT_PATTERNS.map((pattern) => ({
    type: 'MOVEMENT_PATTERN_READY' as const,
    targetMovementPattern: pattern
  }));
}

function skillUnlock(id: string): GraduationRequirement {
  return { type: 'SKILL_UNLOCKED', targetSkillNodeId: id };
}

function skillMastered(id: string): GraduationRequirement {
  return { type: 'SKILL_MASTERED', targetSkillNodeId: id };
}

export function createPracticalHomeContract(userId: string): GraduationContract {
  const requirements: GraduationRequirement[] = [
    ...movementPatternRequirements(),
    skillUnlock('weighted-pull-up'),
    skillUnlock('weighted-ring-push-up'),
    skillUnlock('wall-hspu'),
    skillUnlock('weighted-pistol'),
    skillUnlock('weighted-nordic-curl'),
    skillUnlock('l-sit')
  ];
  return {
    id: `contract-practical-home-${userId}`,
    userId,
    template: 'PRACTICAL_HOME_INDEPENDENCE',
    requirements,
    status: 'active'
  };
}

export function createAdvancedCalisthenicsContract(userId: string): GraduationContract {
  const requirements: GraduationRequirement[] = [
    ...movementPatternRequirements(),
    skillUnlock('strict-bar-muscle-up'),
    skillUnlock('freestanding-handstand'),
    skillUnlock('wall-hspu'),
    skillUnlock('weighted-pull-up'),
    skillUnlock('weighted-ring-push-up'),
    skillUnlock('weighted-pistol'),
    skillUnlock('l-sit'),
    skillUnlock('full-front-lever')
  ];
  return {
    id: `contract-advanced-${userId}`,
    userId,
    template: 'ADVANCED_CALISTHENICS_GRADUATION',
    requirements,
    status: 'active'
  };
}

export function createEliteMasteryContract(userId: string): GraduationContract {
  const requirements: GraduationRequirement[] = [
    ...movementPatternRequirements(),
    skillMastered('weighted-hspu'),
    skillMastered('heavy-weighted-pull-up'),
    skillMastered('strict-bar-muscle-up'),
    skillMastered('weighted-ring-push-up'),
    skillMastered('heavy-weighted-pistol'),
    skillMastered('full-front-lever'),
    skillMastered('full-back-lever'),
    skillMastered('full-planche'),
    skillUnlock('iron-cross')
  ];
  return {
    id: `contract-elite-${userId}`,
    userId,
    template: 'ELITE_MASTERY',
    requirements,
    status: 'active'
  };
}

export function createGraduationContract(
  template: GraduationTemplate,
  userId: string
): GraduationContract {
  switch (template) {
    case 'PRACTICAL_HOME_INDEPENDENCE':
      return createPracticalHomeContract(userId);
    case 'ADVANCED_CALISTHENICS_GRADUATION':
      return createAdvancedCalisthenicsContract(userId);
    case 'ELITE_MASTERY':
      return createEliteMasteryContract(userId);
    default:
      return createPracticalHomeContract(userId);
  }
}
