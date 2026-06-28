import { describe, it, expect } from 'vitest';
import {
  generateProjection,
  projectExerciseProgression,
  projectionExerciseIds,
  projectionSkillFamilyIds,
  type ProjectionInput,
  type ProjectionSettings
} from '../src/projection/engine.js';

function baseInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  const settings: ProjectionSettings = {
    durationWeeks: 12,
    deloadFrequency: 4,
    speed: 'moderate',
    upperBodyIncrementKg: 2.5,
    lowerBodyIncrementKg: 5,
    dumbbellIncrementKg: 2.5,
    machineIncrementKg: 2.5,
    unitSystem: 'metric'
  };
  return {
    settings,
    gymInputs: [],
    skillLevels: [],
    ...overrides
  };
}

describe('projection engine', () => {
  it('projects incline dumbbell press 25 kg deterministically with double progression', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'incline-dumbbell-press', loadKg: 25 }]
    });
    const result = generateProjection(input);
    const incline = result.weeks.map((w) => w.exerciseEntries.find((e) => e.exerciseId === 'incline-dumbbell-press')!);

    expect(incline[0].loadKg).toBe(25);
    expect(incline[0].repTargets).toEqual([6, 6, 6]);
    expect(incline[1].loadKg).toBe(25);
    expect(incline[1].repTargets).toEqual([7, 7, 7]);
    expect(incline[2].loadKg).toBe(25);
    expect(incline[2].repTargets).toEqual([8, 8, 8]);
    // Week 4 is deload
    expect(incline[3].isDeload).toBe(true);
    // Week 5 resets reps to bottom after load jump
    expect(incline[4].loadKg).toBe(27.5);
    expect(incline[4].repTargets).toEqual([6, 6, 6]);
  });

  it('resets reps to bottom of range after ADD_LOAD', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'bench-press', loadKg: 80 }],
      settings: { ...baseInput().settings, durationWeeks: 6, deloadFrequency: 0 }
    });
    const result = generateProjection(input);
    const bench = result.weeks.map((w) => w.exerciseEntries.find((e) => e.exerciseId === 'bench-press')!);

    // Range 4-6, 3 sets. Week 1 [4,4,4], 2 [5,5,5], 3 [6,6,6], 4 -> load jump, reset
    const week4 = bench[3];
    expect(week4.loadKg).toBe(82.5);
    expect(week4.repTargets).toEqual([4, 4, 4]);
  });

  it('marks deload weeks correctly', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'back-squat', loadKg: 100 }]
    });
    const result = generateProjection(input);
    expect(result.deloadWeeks).toEqual([4, 8, 12]);
    expect(result.weeks[3].isDeload).toBe(true);
    expect(result.weeks[4].isDeload).toBe(false);
  });

  it('applies dumbbell increments per hand', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'chest-supported-row', loadKg: 20 }],
      settings: { ...baseInput().settings, dumbbellIncrementKg: 2.5, durationWeeks: 8, deloadFrequency: 0 }
    });
    const row = generateProjection(input).weeks.map((w) => w.exerciseEntries.find((e) => e.exerciseId === 'chest-supported-row')!);
    // Range 6-8, 3 sets. Progress: w1 [6,6,6], w2 [7,7,7], w3 [8,8,8], w4 -> load jump
    expect(row[3].loadDisplay).toContain('22.5');
    expect(row[3].loadDisplay).toContain('/hand');
  });

  it('projects pull-up level 1 to band-assisted or early pull-up drills', () => {
    const input = baseInput({
      skillLevels: [{ familyId: 'pull-up', level: 1 }]
    });
    const result = generateProjection(input);
    const first = result.weeks[0].skillEntries.find((s) => s.familyId === 'pull-up')!;
    expect(first.nodeName).toMatch(/Assisted|Chin-up|Scapular/);
    expect(first.level).toBeLessThanOrEqual(2);
  });

  it('does not skip skill levels', () => {
    const input = baseInput({
      skillLevels: [
        { familyId: 'pull-up', level: 0 },
        { familyId: 'front-lever', level: 0 }
      ],
      settings: { ...baseInput().settings, speed: 'aggressive' }
    });
    const result = generateProjection(input);
    for (const familyId of ['pull-up', 'front-lever']) {
      const levels = result.weeks.map((w) => w.skillEntries.find((s) => s.familyId === familyId)!.level);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
        expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('differs between conservative and aggressive speeds', () => {
    const base = baseInput({
      skillLevels: [{ familyId: 'pistol', level: 0 }],
      settings: { ...baseInput().settings, durationWeeks: 8, deloadFrequency: 0 }
    });
    const conservative = generateProjection({ ...base, settings: { ...base.settings, speed: 'conservative' } });
    const aggressive = generateProjection({ ...base, settings: { ...base.settings, speed: 'aggressive' } });

    const consLevel = conservative.weeks[7].skillEntries.find((s) => s.familyId === 'pistol')!.level;
    const aggLevel = aggressive.weeks[7].skillEntries.find((s) => s.familyId === 'pistol')!.level;
    expect(aggLevel).toBeGreaterThanOrEqual(consLevel);
  });

  it('does not overwrite actual prescriptions (pure function)', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'back-squat', loadKg: 100 }]
    });
    const result = generateProjection(input);
    expect(result).toBeDefined();
    // The engine has no side effects; re-running with same input gives same output.
    expect(generateProjection(input)).toEqual(result);
  });

  it('includes projection for explicitly entered extra exercises', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'hip-thrust', loadKg: 80 }]
    });
    const result = generateProjection(input);
    const entries = result.weeks.flatMap((w) => w.exerciseEntries);
    expect(entries.some((e) => e.exerciseId === 'hip-thrust')).toBe(true);
  });

  it('exposes projection exercise and skill ids', () => {
    expect(projectionExerciseIds()).toContain('incline-dumbbell-press');
    expect(projectionSkillFamilyIds()).toContain('hspu');
  });

  it('projectExerciseProgression returns week-by-week load and reps', () => {
    const input = baseInput({
      gymInputs: [{ exerciseId: 'overhead-press', loadKg: 40 }]
    });
    const prog = projectExerciseProgression('overhead-press', input);
    expect(prog[0].loadKg).toBe(40);
    expect(prog[0].repTargets.length).toBeGreaterThan(0);
    expect(prog.every((p) => p.weekNumber > 0)).toBe(true);
  });
});
