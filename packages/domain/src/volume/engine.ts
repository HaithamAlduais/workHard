import type { Exercise, SetLog, SkillNode, SkillAttempt, VolumeEntry } from '../types.js';

const SECONDARY_CONTRIBUTION = 0.5;

export function classifySetVolume(
  exercise: Exercise,
  set: SetLog,
  role: 'primary' | 'secondary'
): Partial<VolumeEntry> {
  const baseDirect = role === 'primary' ? 1.0 : SECONDARY_CONTRIBUTION;
  const estimated = role === 'primary' ? SECONDARY_CONTRIBUTION : 0;

  if (set.painLevel >= 2 || set.form === 'poor' || set.rom !== 'full') {
    return {
      muscleId: exercise.primaryMuscleIds[0] ?? 'unknown',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: 0,
      techniqueSets: 0,
      powerSets: 0
    };
  }

  if (exercise.role === 'TECHNIQUE_ONLY') {
    return {
      muscleId: exercise.primaryMuscleIds[0] ?? 'unknown',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: 0,
      techniqueSets: role === 'primary' ? 1.0 : SECONDARY_CONTRIBUTION,
      powerSets: 0
    };
  }

  if (exercise.role === 'POWER_ONLY') {
    return {
      muscleId: exercise.primaryMuscleIds[0] ?? 'unknown',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: 0,
      techniqueSets: 0,
      powerSets: role === 'primary' ? 1.0 : SECONDARY_CONTRIBUTION
    };
  }

  return {
    muscleId: exercise.primaryMuscleIds[0] ?? 'unknown',
    directSets: baseDirect,
    estimatedEffectiveSets: estimated,
    staticExposureSeconds: 0,
    techniqueSets: 0,
    powerSets: 0
  };
}

export function classifySkillVolume(node: SkillNode, attempt: SkillAttempt): Partial<VolumeEntry> {
  if (attempt.painLevel >= 2 || attempt.qualityScore < node.targetQuality) {
    return {
      muscleId: 'skill',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: 0,
      techniqueSets: 0,
      powerSets: 0
    };
  }

  if (node.volumeRule === 'TECHNIQUE_NO_VOLUME' || node.role === 'technique') {
    return {
      muscleId: 'skill',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: attempt.validHoldSeconds ?? 0,
      techniqueSets: 1,
      powerSets: 0
    };
  }

  if (node.volumeRule === 'STATIC_EXPOSURE' || node.staticOrDynamic === 'static') {
    return {
      muscleId: 'skill',
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: attempt.validHoldSeconds ?? 0,
      techniqueSets: 0,
      powerSets: 0
    };
  }

  const countsAsSet = node.volumeRule === 'WEIGHTED_DYNAMIC_FULL_SET' || node.volumeRule === 'DYNAMIC_FULL_SET';
  const directSets = countsAsSet ? 1.0 : 0;
  const estimated = countsAsSet ? 0.5 : 0;

  return {
    muscleId: 'skill',
    directSets,
    estimatedEffectiveSets: estimated,
    staticExposureSeconds: 0,
    techniqueSets: 0,
    powerSets: 0
  };
}

export function aggregateVolume(entries: Partial<VolumeEntry>[]): VolumeEntry[] {
  const map = new Map<string, VolumeEntry>();

  for (const e of entries) {
    const id = e.muscleId ?? 'unknown';
    const existing = map.get(id) ?? {
      muscleId: id,
      directSets: 0,
      estimatedEffectiveSets: 0,
      staticExposureSeconds: 0,
      techniqueSets: 0,
      powerSets: 0
    };
    existing.directSets += e.directSets ?? 0;
    existing.estimatedEffectiveSets += e.estimatedEffectiveSets ?? 0;
    existing.staticExposureSeconds += e.staticExposureSeconds ?? 0;
    existing.techniqueSets += e.techniqueSets ?? 0;
    existing.powerSets += e.powerSets ?? 0;
    map.set(id, existing);
  }

  return Array.from(map.values());
}

export function calculateRelativeWeightedLoad(entry: { bodyweightKg: number; externalLoadKg: number }): number {
  if (entry.bodyweightKg <= 0) return 0;
  return Number(((entry.externalLoadKg / entry.bodyweightKg) * 100).toFixed(1));
}

export function calculateSystemLoad(entry: { bodyweightKg: number; externalLoadKg: number; assistanceLoadKg: number }): number {
  return entry.bodyweightKg + entry.externalLoadKg - entry.assistanceLoadKg;
}
