import { describe, it, expect } from 'vitest';
import { decideStrengthProgression, decideHypertrophyProgression, decidePowerQuality } from '../src/strength/progression.js';

function goodSet(reps: number, overrides?: Partial<Parameters<typeof decideStrengthProgression>[0]['lastSets'][0]>) {
  return { reps, rir: 2, rom: 'full' as const, form: 'good' as const, painLevel: 0, ...overrides };
}

describe('Strength progression', () => {
  it('adds reps when min met but not all at top', () => {
    const input = {
      exerciseId: 'bench',
      targetRange: { min: 3, max: 5 },
      currentLoadKg: 80,
      lastSets: [goodSet(3), goodSet(4), goodSet(3)],
      bodyRegion: 'upper' as const,
      smallestPlateKg: 1.25
    };
    const decision = decideStrengthProgression(input);
    expect(decision.type).toBe('ADD_REPS');
    expect((decision as any).addedReps).toBe(1);
  });

  it('adds load when all sets reach top with good form', () => {
    const input = {
      exerciseId: 'bench',
      targetRange: { min: 3, max: 5 },
      currentLoadKg: 80,
      lastSets: [goodSet(5), goodSet(5), goodSet(5)],
      bodyRegion: 'upper' as const,
      smallestPlateKg: 1.25
    };
    const decision = decideStrengthProgression(input);
    expect(decision.type).toBe('ADD_LOAD');
    expect((decision as any).newLoadKg).toBe(81.25);
  });

  it('reduces load on multiple failures', () => {
    const input = {
      exerciseId: 'squat',
      targetRange: { min: 3, max: 5 },
      currentLoadKg: 100,
      lastSets: [goodSet(2), goodSet(2), goodSet(3)],
      bodyRegion: 'lower' as const,
      smallestPlateKg: 2.5
    };
    const decision = decideStrengthProgression(input);
    expect(decision.type).toBe('REDUCE_LOAD');
    expect((decision as any).newLoadKg).toBe(95);
  });

  it('holds progression when pain reported', () => {
    const input = {
      exerciseId: 'press',
      targetRange: { min: 4, max: 6 },
      currentLoadKg: 50,
      lastSets: [goodSet(5), goodSet(5), goodSet(5)],
      bodyRegion: 'upper' as const,
      smallestPlateKg: 1.25,
      painReported: true
    };
    const decision = decideStrengthProgression(input);
    expect(decision.type).toBe('HOLD_FOR_SAFETY');
  });

  it('maintains load when data is mixed', () => {
    const input = {
      exerciseId: 'row',
      targetRange: { min: 4, max: 6 },
      currentLoadKg: 60,
      lastSets: [goodSet(6), goodSet(3), goodSet(5)],
      bodyRegion: 'upper' as const,
      smallestPlateKg: 2.5
    };
    const decision = decideStrengthProgression(input);
    expect(decision.type).toBe('MAINTAIN_LOAD');
  });
});

describe('Hypertrophy progression', () => {
  it('double progresses by adding reps then load', () => {
    const base = {
      exerciseId: 'curl',
      targetRange: { min: 8, max: 12 },
      currentLoadKg: 15,
      smallestPlateKg: 1.25,
      lastSets: [goodSet(10), goodSet(10), goodSet(10)]
    };
    const d1 = decideHypertrophyProgression(base);
    expect(d1.type).toBe('ADD_REPS');

    const d2 = decideHypertrophyProgression({ ...base, lastSets: [goodSet(12), goodSet(12), goodSet(12)] });
    expect(d2.type).toBe('ADD_LOAD');
    expect((d2 as any).newLoadKg).toBe(16.25);
  });
});

describe('Power quality', () => {
  it('stops when velocity drops', () => {
    const decision = decidePowerQuality({
      exerciseId: 'jump',
      sets: [{ quality: 'fast' }, { quality: 'acceptable' }, { quality: 'slower' }]
    });
    expect(decision.type).toBe('STOP_VELOCITY_DROP');
  });
});
