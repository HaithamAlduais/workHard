import { describe, it, expect } from 'vitest';
import { buildTimeBudget } from '../src/index.js';

describe('Time-budget engine', () => {
  it('keeps all blocks when under budget', () => {
    const decision = buildTimeBudget({
      availableMinutes: 60,
      blocks: [
        { id: 'prep', orderClass: 'PREPARATION', tier: 1, estimatedMinutes: 5, minRestSeconds: 0, exercises: [] },
        { id: 'skill', orderClass: 'TECHNIQUE_FIRST', tier: 1, estimatedMinutes: 8, minRestSeconds: 0, exercises: [] },
        { id: 'power', orderClass: 'POWER', tier: 2, estimatedMinutes: 8, minRestSeconds: 90, exercises: [] }
      ]
    });
    expect(decision.fits).toBe(true);
    expect(decision.removedBlocks).toHaveLength(0);
  });

  it('removes lowest-tier blocks when over budget', () => {
    const decision = buildTimeBudget({
      availableMinutes: 15,
      blocks: [
        { id: 'prep', orderClass: 'PREPARATION', tier: 1, estimatedMinutes: 5, minRestSeconds: 0, exercises: [] },
        { id: 'skill', orderClass: 'TECHNIQUE_FIRST', tier: 1, estimatedMinutes: 8, minRestSeconds: 0, exercises: [] },
        { id: 'arms', orderClass: 'ACCESSORY', tier: 5, estimatedMinutes: 10, minRestSeconds: 60, exercises: [] }
      ]
    });
    expect(decision.fits).toBe(false);
    expect(decision.removedBlocks.some((b) => b.id === 'arms')).toBe(true);
    expect(decision.removedBlocks.some((b) => b.id === 'skill')).toBe(false);
  });
});
