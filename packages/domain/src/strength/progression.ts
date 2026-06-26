import type { StrengthProgressionInput, StrengthDecision, HypertrophyProgressionInput, HypertrophyDecision, PowerQualityInput, PowerDecision } from '../types.js';

export function decideStrengthProgression(input: StrengthProgressionInput): StrengthDecision {
  const { targetRange, currentLoadKg, lastSets, bodyRegion, smallestPlateKg, requestedDeload, painReported } = input;

  if (painReported || requestedDeload) {
    const reductionPercent = painReported ? 0.05 : 0.1;
    const newLoadKg = roundToPlate(currentLoadKg * (1 - reductionPercent), smallestPlateKg);
    return {
      type: 'HOLD_FOR_SAFETY',
      reason: painReported
        ? 'Pain reported. Reduce load ~5% and hold progression until pain-free.'
        : 'Deload requested. Reduce load ~10% and recover.'
    };
  }

  if (lastSets.length === 0) {
    return { type: 'MAINTAIN_LOAD', reason: 'No recent sets recorded. Maintain current load.' };
  }

  const failures = lastSets.filter((s) => s.reps < targetRange.min || s.painLevel >= 2 || s.form === 'poor' || s.rom !== 'full');
  const twoOrMoreFailures = failures.length >= 2;
  const involuntaryFailure = lastSets.some((s) => s.rir < 0);
  const significantPain = lastSets.some((s) => s.painLevel >= 2);

  if (twoOrMoreFailures || involuntaryFailure || significantPain) {
    const reductionPercent = 0.05;
    const newLoadKg = roundToPlate(currentLoadKg * (1 - reductionPercent), smallestPlateKg);
    return {
      type: 'REDUCE_LOAD',
      newLoadKg,
      reductionPercent,
      reason: 'Two or more sets missed minimum range, involuntary failure, or significant pain. Reduce load ~5%.'
    };
  }

  const allAtTop = lastSets.every((s) => s.reps >= targetRange.max && s.rir >= 1 && s.form !== 'poor' && s.rom === 'full' && s.painLevel === 0);

  if (allAtTop) {
    const incrementKg = bodyRegion === 'lower' ? Math.max(smallestPlateKg, 2.5) : Math.max(smallestPlateKg, 1.25);
    const newLoadKg = roundToPlate(currentLoadKg + incrementKg, smallestPlateKg);
    return {
      type: 'ADD_LOAD',
      newLoadKg,
      incrementKg,
      reason: `All sets reached top of range ${targetRange.max} with good form and 1+ RIR. Increase load by ${incrementKg} kg.`
    };
  }

  const allAboveMin = lastSets.every((s) => s.reps >= targetRange.min && s.rir >= 1 && s.form !== 'poor' && s.rom === 'full' && s.painLevel === 0);

  if (allAboveMin) {
    return { type: 'ADD_REPS', addedReps: 1, reason: `All sets meet minimum range ${targetRange.min} but not all reached ${targetRange.max}. Add one total repetition.` };
  }

  return { type: 'MAINTAIN_LOAD', reason: 'Sets did not uniformly meet progression criteria. Maintain current load.' };
}

export function decideHypertrophyProgression(input: HypertrophyProgressionInput): HypertrophyDecision {
  const { targetRange, currentLoadKg, lastSets, smallestPlateKg, requestedDeload, painReported } = input;

  if (painReported || requestedDeload) {
    return {
      type: 'HOLD_FOR_SAFETY',
      reason: painReported
        ? 'Pain reported. Hold hypertrophy progression until pain-free.'
        : 'Deload requested. Hold progression and recover.'
    };
  }

  if (lastSets.length === 0) {
    return { type: 'MAINTAIN_LOAD', reason: 'No recent sets recorded. Maintain current load.' };
  }

  const failures = lastSets.filter((s) => s.reps < targetRange.min || s.painLevel >= 2 || s.form === 'poor' || s.rom !== 'full');
  const twoOrMoreFailures = failures.length >= 2;
  const significantPain = lastSets.some((s) => s.painLevel >= 2);

  if (twoOrMoreFailures || significantPain) {
    const newLoadKg = roundToPlate(currentLoadKg * 0.95, smallestPlateKg);
    return {
      type: 'REDUCE_LOAD',
      newLoadKg,
      reductionPercent: 0.05,
      reason: 'Hypertrophy sets failed minimum range or significant pain. Reduce load ~5%.'
    };
  }

  const allAtTop = lastSets.every((s) => s.reps >= targetRange.max && s.rir >= 1 && s.form !== 'poor' && s.rom === 'full' && s.painLevel === 0);

  if (allAtTop) {
    const incrementKg = smallestPlateKg;
    const newLoadKg = roundToPlate(currentLoadKg + incrementKg, smallestPlateKg);
    return {
      type: 'ADD_LOAD',
      newLoadKg,
      incrementKg,
      reason: `All sets reached top of hypertrophy range ${targetRange.max}. Increase load by ${incrementKg} kg.`
    };
  }

  const allAboveMin = lastSets.every((s) => s.reps >= targetRange.min && s.rir >= 1 && s.form !== 'poor' && s.rom === 'full' && s.painLevel === 0);

  if (allAboveMin) {
    return { type: 'ADD_REPS', addedReps: 1, reason: `Sets within range but not all at top ${targetRange.max}. Add one total repetition.` };
  }

  return { type: 'MAINTAIN_LOAD', reason: 'Hypertrophy sets did not meet progression criteria. Maintain current load.' };
}

export function decidePowerQuality(input: PowerQualityInput): PowerDecision {
  const { sets } = input;
  if (sets.length === 0) return { type: 'CONTINUE', reason: 'No power sets logged yet.' };

  const hasSlower = sets.some((s) => s.quality === 'slower');
  const consecutiveDecline = sets.length >= 2 && sets[sets.length - 1].quality === 'slower' && sets[sets.length - 2].quality !== 'fast';

  if (consecutiveDecline || hasSlower) {
    return { type: 'STOP_VELOCITY_DROP', reason: 'Velocity or quality dropped. Stop power exercise to preserve speed.' };
  }

  return { type: 'CONTINUE', reason: 'Power quality acceptable. Continue as planned.' };
}

function roundToPlate(loadKg: number, plateKg: number): number {
  const rounded = Math.round(loadKg / plateKg) * plateKg;
  return Math.max(0, Number(rounded.toFixed(2)));
}
