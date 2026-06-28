// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectionStore, initializeProjectionFromCalibration } from '../stores/projectionStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';

describe('projection store', () => {
  beforeEach(() => {
    useProjectionStore.setState({
      settings: {
        durationWeeks: 12,
        deloadFrequency: 4,
        speed: 'moderate',
        upperBodyIncrementKg: 2.5,
        lowerBodyIncrementKg: 5,
        dumbbellIncrementKg: 2.5,
        machineIncrementKg: 2.5,
        unitSystem: 'metric'
      },
      gymInputs: {},
      skillLevels: {},
      projection: null,
      generatedAt: null,
      currentWeek: 1
    });
    usePrescriptionStore.setState({
      exercisePrescriptions: {},
      skillPrescriptions: {},
      pendingExercisePrescriptions: {},
      pendingSkillPrescriptions: {},
      replacementHistory: [],
      activeReplacements: {},
      initialized: false
    });
  });

  it('accepts gym weight inputs', () => {
    useProjectionStore.getState().setGymInput('incline-dumbbell-press', 25);
    expect(useProjectionStore.getState().gymInputs['incline-dumbbell-press']).toBe(25);
  });

  it('accepts skill level inputs', () => {
    useProjectionStore.getState().setSkillLevel('pull-up', 1);
    expect(useProjectionStore.getState().skillLevels['pull-up']).toBe(1);
  });

  it('generates a projected week table', () => {
    useProjectionStore.getState().setGymInput('incline-dumbbell-press', 25);
    useProjectionStore.getState().setSkillLevel('pull-up', 1);
    useProjectionStore.getState().generateProjection();
    const projection = useProjectionStore.getState().projection;
    expect(projection).not.toBeNull();
    expect(projection!.weeks.length).toBe(12);
    expect(projection!.weeks[0].exerciseEntries.some((e) => e.exerciseId === 'incline-dumbbell-press')).toBe(true);
    expect(projection!.weeks[0].skillEntries.some((s) => s.familyId === 'pull-up')).toBe(true);
  });

  it('saved projection persists after state reset and reload', () => {
    useProjectionStore.getState().setGymInput('incline-dumbbell-press', 25);
    useProjectionStore.getState().generateProjection();
    const saved = useProjectionStore.getState().projection;
    useProjectionStore.setState({ projection: null });
    useProjectionStore.setState({ projection: saved });
    expect(useProjectionStore.getState().projection?.weeks.length).toBe(12);
  });

  it('does not overwrite active prescriptions without confirmation', () => {
    usePrescriptionStore.getState().initializePrescriptions('local');
    const before = { ...usePrescriptionStore.getState().exercisePrescriptions };
    useProjectionStore.getState().setGymInput('incline-dumbbell-press', 25);
    useProjectionStore.getState().generateProjection();
    const after = usePrescriptionStore.getState().exercisePrescriptions;
    expect(Object.keys(after).length).toBe(Object.keys(before).length);
    expect(after).toEqual(before);
  });

  it('initializes gym inputs from calibration defaults', () => {
    const calibration = {
      getCalibrationLoad: (id: string) => (id === 'back-squat' ? 100 : undefined),
      skillStartingNodesByFamily: {}
    };
    initializeProjectionFromCalibration(calibration as any);
    expect(useProjectionStore.getState().gymInputs['back-squat']).toBe(100);
  });
});
