import type { TimeBudgetInput, TimeBudgetDecision, TimeBlock } from '../types.js';

export function buildTimeBudget(input: TimeBudgetInput): TimeBudgetDecision {
  const { blocks, availableMinutes } = input;
  const sorted = [...blocks].sort((a, b) => a.tier - b.tier);
  const removed: TimeBlock[] = [];
  const warnings: string[] = [];
  let total = 0;

  for (const block of sorted) {
    if (block.required) {
      total += block.estimatedMinutes;
      if (total > availableMinutes) {
        warnings.push(
          `Kept required ${block.id} (tier ${block.tier}) even though it pushes the session over ${availableMinutes} minutes.`
        );
      }
      continue;
    }

    if (total + block.estimatedMinutes <= availableMinutes) {
      total += block.estimatedMinutes;
    } else {
      removed.push(block);
      warnings.push(`Removed ${block.id} (tier ${block.tier}) to keep session under ${availableMinutes} minutes.`);
    }
  }

  if (removed.some((r) => r.tier === 1 || r.tier === 2)) {
    warnings.push('Warning: safety preparation or primary skill was considered for removal. Review schedule.');
  }

  return {
    fits: removed.length === 0 && total <= availableMinutes,
    totalMinutes: total,
    removedBlocks: removed,
    warnings
  };
}
