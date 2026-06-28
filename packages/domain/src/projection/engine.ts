import { getExerciseById, getSkillNode, getNodesByFamily, HYBRID_CURRICULUM } from '../index.js';
import type { SkillNode, UnitSystem } from '../types.js';
import type { ProgramDay } from '../programs/curriculum.js';

export type ProjectionSpeed = 'conservative' | 'moderate' | 'aggressive';
export type ProjectionLoadType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'hold' | 'power';

export interface ProjectionSettings {
  durationWeeks: number;
  deloadFrequency: number;
  speed: ProjectionSpeed;
  upperBodyIncrementKg: number;
  lowerBodyIncrementKg: number;
  dumbbellIncrementKg: number;
  machineIncrementKg: number;
  unitSystem: UnitSystem;
}

export interface GymExerciseInput {
  exerciseId: string;
  loadKg: number;
}

export interface SkillLevelInput {
  familyId: string;
  level: number;
}

export interface ProjectionInput {
  settings: ProjectionSettings;
  gymInputs: GymExerciseInput[];
  skillLevels: SkillLevelInput[];
  activeCurriculum?: ProgramDay[];
  skillPriorities?: {
    primarySkillFamilyId: string;
    secondarySkillFamilyIds: string[];
    maintenanceSkillFamilyIds: string[];
    inactiveSkillFamilyIds: string[];
  };
  bodyweightKg?: number;
}

export interface ProjectedExerciseEntry {
  dayId: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repTargets: number[];
  loadKg: number;
  loadDisplay: string;
  holdSeconds?: number;
  isDeload: boolean;
  notes: string;
}

export interface ProjectedSkillEntry {
  familyId: string;
  familyName: string;
  nodeId: string;
  nodeName: string;
  level: number;
  targetSets: number;
  targetRepsOrHoldSeconds: number;
  targetQuality: number;
  nextNodeId: string | null;
  nextLevelAt: number | null;
  isDeload: boolean;
  notes: string;
}

export interface ProjectedWeek {
  weekNumber: number;
  isDeload: boolean;
  exerciseEntries: ProjectedExerciseEntry[];
  skillEntries: ProjectedSkillEntry[];
}

export interface ProjectionDashboardSummary {
  currentProjectedWeek: number;
  totalWeeks: number;
  nextProgression: string;
  deloadWarning: string | null;
  primarySkillTarget: string;
}

export interface ProjectionResult {
  settings: ProjectionSettings;
  weeks: ProjectedWeek[];
  deloadWeeks: number[];
  warnings: string[];
  dashboardSummary: ProjectionDashboardSummary;
}

export interface ProjectionExerciseConfig {
  exerciseId: string;
  dayId: 'day1' | 'day2' | 'day3';
  sets: number;
  repRange: { min: number; max: number };
  loadType: ProjectionLoadType;
  bodyRegion: 'upper' | 'lower' | 'core';
  defaultLoadKg: number;
  holdSeconds?: number;
}

export const PROJECTION_EXERCISE_CONFIG: ProjectionExerciseConfig[] = [
  // Day 1
  { exerciseId: 'handstand-wall', dayId: 'day1', sets: 5, repRange: { min: 20, max: 45 }, loadType: 'hold', bodyRegion: 'upper', defaultLoadKg: 0, holdSeconds: 30 },
  { exerciseId: 'box-jump', dayId: 'day1', sets: 3, repRange: { min: 3, max: 3 }, loadType: 'power', bodyRegion: 'lower', defaultLoadKg: 0 },
  { exerciseId: 'back-squat', dayId: 'day1', sets: 3, repRange: { min: 3, max: 5 }, loadType: 'barbell', bodyRegion: 'lower', defaultLoadKg: 60 },
  { exerciseId: 'weighted-pull-up', dayId: 'day1', sets: 3, repRange: { min: 4, max: 6 }, loadType: 'bodyweight', bodyRegion: 'upper', defaultLoadKg: 5 },
  { exerciseId: 'bench-press', dayId: 'day1', sets: 3, repRange: { min: 4, max: 6 }, loadType: 'barbell', bodyRegion: 'upper', defaultLoadKg: 50 },
  { exerciseId: 'seated-leg-curl', dayId: 'day1', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'lower', defaultLoadKg: 20 },
  { exerciseId: 'cable-lateral-raise', dayId: 'day1', sets: 2, repRange: { min: 12, max: 20 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 5 },
  { exerciseId: 'ez-curl', dayId: 'day1', sets: 2, repRange: { min: 6, max: 10 }, loadType: 'barbell', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'triceps-pressdown', dayId: 'day1', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'standing-calf-raise', dayId: 'day1', sets: 2, repRange: { min: 8, max: 15 }, loadType: 'machine', bodyRegion: 'lower', defaultLoadKg: 40 },
  { exerciseId: 'farmers-carry', dayId: 'day1', sets: 2, repRange: { min: 20, max: 30 }, loadType: 'hold', bodyRegion: 'upper', defaultLoadKg: 20, holdSeconds: 25 },
  // Extras commonly requested
  { exerciseId: 'incline-dumbbell-press', dayId: 'day1', sets: 3, repRange: { min: 6, max: 8 }, loadType: 'dumbbell', bodyRegion: 'upper', defaultLoadKg: 20 },
  { exerciseId: 'flat-dumbbell-press', dayId: 'day1', sets: 3, repRange: { min: 6, max: 8 }, loadType: 'dumbbell', bodyRegion: 'upper', defaultLoadKg: 20 },
  { exerciseId: 'cable-curl', dayId: 'day1', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'hammer-curl', dayId: 'day1', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'dumbbell', bodyRegion: 'upper', defaultLoadKg: 10 },

  // Day 2
  { exerciseId: 'muscle-up', dayId: 'day2', sets: 4, repRange: { min: 1, max: 3 }, loadType: 'bodyweight', bodyRegion: 'upper', defaultLoadKg: 0 },
  { exerciseId: 'medicine-ball-throw', dayId: 'day2', sets: 3, repRange: { min: 4, max: 4 }, loadType: 'power', bodyRegion: 'upper', defaultLoadKg: 0 },
  { exerciseId: 'trap-bar-deadlift', dayId: 'day2', sets: 3, repRange: { min: 3, max: 5 }, loadType: 'barbell', bodyRegion: 'lower', defaultLoadKg: 80 },
  { exerciseId: 'overhead-press', dayId: 'day2', sets: 3, repRange: { min: 4, max: 6 }, loadType: 'barbell', bodyRegion: 'upper', defaultLoadKg: 30 },
  { exerciseId: 'chest-supported-row', dayId: 'day2', sets: 3, repRange: { min: 6, max: 8 }, loadType: 'dumbbell', bodyRegion: 'upper', defaultLoadKg: 20 },
  { exerciseId: 'hack-squat', dayId: 'day2', sets: 2, repRange: { min: 6, max: 10 }, loadType: 'machine', bodyRegion: 'lower', defaultLoadKg: 60 },
  { exerciseId: 'lying-leg-curl', dayId: 'day2', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'lower', defaultLoadKg: 20 },
  { exerciseId: 'ring-push-up', dayId: 'day2', sets: 3, repRange: { min: 6, max: 12 }, loadType: 'bodyweight', bodyRegion: 'upper', defaultLoadKg: 0 },
  { exerciseId: 'lat-pulldown', dayId: 'day2', sets: 3, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 40 },
  { exerciseId: 'plate-pinch', dayId: 'day2', sets: 2, repRange: { min: 20, max: 30 }, loadType: 'hold', bodyRegion: 'upper', defaultLoadKg: 5, holdSeconds: 25 },
  // Extras
  { exerciseId: 'assisted-dip', dayId: 'day2', sets: 3, repRange: { min: 6, max: 10 }, loadType: 'bodyweight', bodyRegion: 'upper', defaultLoadKg: 0 },
  { exerciseId: 'pushdown', dayId: 'day2', sets: 3, repRange: { min: 8, max: 12 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'hip-thrust', dayId: 'day2', sets: 3, repRange: { min: 8, max: 12 }, loadType: 'barbell', bodyRegion: 'lower', defaultLoadKg: 60 },

  // Day 3
  { exerciseId: 'tuck-front-lever', dayId: 'day3', sets: 4, repRange: { min: 6, max: 10 }, loadType: 'hold', bodyRegion: 'upper', defaultLoadKg: 0, holdSeconds: 8 },
  { exerciseId: 'l-sit', dayId: 'day3', sets: 3, repRange: { min: 10, max: 20 }, loadType: 'hold', bodyRegion: 'core', defaultLoadKg: 0, holdSeconds: 15 },
  { exerciseId: 'trap-bar-jump', dayId: 'day3', sets: 3, repRange: { min: 3, max: 3 }, loadType: 'power', bodyRegion: 'lower', defaultLoadKg: 0 },
  { exerciseId: 'front-squat', dayId: 'day3', sets: 3, repRange: { min: 4, max: 6 }, loadType: 'barbell', bodyRegion: 'lower', defaultLoadKg: 50 },
  { exerciseId: 'low-incline-press', dayId: 'day3', sets: 3, repRange: { min: 4, max: 6 }, loadType: 'barbell', bodyRegion: 'upper', defaultLoadKg: 50 },
  { exerciseId: 'lat-pulldown', dayId: 'day3', sets: 3, repRange: { min: 6, max: 10 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 45 },
  { exerciseId: 'romanian-deadlift', dayId: 'day3', sets: 3, repRange: { min: 6, max: 10 }, loadType: 'barbell', bodyRegion: 'lower', defaultLoadKg: 60 },
  { exerciseId: 'reverse-pec-deck', dayId: 'day3', sets: 2, repRange: { min: 12, max: 20 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'leg-extension', dayId: 'day3', sets: 2, repRange: { min: 10, max: 15 }, loadType: 'machine', bodyRegion: 'lower', defaultLoadKg: 30 },
  { exerciseId: 'cable-lateral-raise', dayId: 'day3', sets: 2, repRange: { min: 12, max: 20 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 5 },
  { exerciseId: 'reverse-curl', dayId: 'day3', sets: 2, repRange: { min: 8, max: 12 }, loadType: 'barbell', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'cable-triceps-pressdown', dayId: 'day3', sets: 2, repRange: { min: 10, max: 15 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 15 },
  { exerciseId: 'single-leg-calf-raise', dayId: 'day3', sets: 3, repRange: { min: 10, max: 15 }, loadType: 'bodyweight', bodyRegion: 'lower', defaultLoadKg: 0 },
  { exerciseId: 'towel-dead-hang', dayId: 'day3', sets: 2, repRange: { min: 20, max: 30 }, loadType: 'hold', bodyRegion: 'upper', defaultLoadKg: 0, holdSeconds: 25 },
  // Extras
  { exerciseId: 'bulgarian-split-squat', dayId: 'day3', sets: 3, repRange: { min: 6, max: 10 }, loadType: 'dumbbell', bodyRegion: 'lower', defaultLoadKg: 15 },
  { exerciseId: 'rear-delt-fly', dayId: 'day3', sets: 2, repRange: { min: 12, max: 20 }, loadType: 'machine', bodyRegion: 'upper', defaultLoadKg: 10 },
  { exerciseId: 'assisted-pull-up', dayId: 'day3', sets: 3, repRange: { min: 6, max: 10 }, loadType: 'bodyweight', bodyRegion: 'upper', defaultLoadKg: 0 }
];

export interface ProjectionSkillFamilyConfig {
  familyId: string;
  name: string;
  nameAr: string;
  // Optional explicit node for each user level 0-5.
  levelNodeIds?: string[];
}

export const PROJECTION_SKILL_FAMILIES: ProjectionSkillFamilyConfig[] = [
  { familyId: 'pull-up', name: 'Pull-up', nameAr: 'السحب' },
  { familyId: 'muscle-up', name: 'Muscle-up', nameAr: 'العضلة العكسية' },
  { familyId: 'handstand', name: 'Handstand', nameAr: 'الوقوف على اليدين' },
  { familyId: 'hspu', name: 'Handstand Push-up', nameAr: 'الدفع على اليدين' },
  { familyId: 'ring-push-up', name: 'Ring Push-up', nameAr: 'الضغط بالحلقات' },
  { familyId: 'l-sit', name: 'L-sit', nameAr: 'الجلوس L' },
  { familyId: 'front-lever', name: 'Front Lever', nameAr: 'الرافعة الأمامية' },
  { familyId: 'back-lever', name: 'Back Lever', nameAr: 'الرافعة الخلفية' },
  { familyId: 'planche', name: 'Planche', nameAr: 'البلانش' },
  { familyId: 'pistol', name: 'Pistol Squat', nameAr: 'القرفصاء برجل واحدة' },
  { familyId: 'knee-flexion', name: 'Knee Flexion / Nordic Curl', nameAr: 'ثني الركبة / نورديك' }
];

function difficultyToLinearLevel(difficulty: SkillNode['difficulty']): number {
  switch (difficulty) {
    case 'fundamental':
      return 0;
    case 'beginner':
      return 1;
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    case 'expert':
      return 4;
    default:
      return 0;
  }
}

function linearLevelForNode(node: SkillNode, familyNodes: SkillNode[]): number {
  const maxIndex = Math.max(1, familyNodes.length - 1);
  const index = familyNodes.findIndex((n) => n.id === node.id);
  const stageLevel = Math.min(5, Math.round((index / maxIndex) * 5));
  const diffLevel = difficultyToLinearLevel(node.difficulty);
  return Math.min(5, Math.max(stageLevel, diffLevel));
}

export function skillFamilyNodeForLevel(familyConfig: ProjectionSkillFamilyConfig, level: number): SkillNode | undefined {
  const clamped = Math.min(5, Math.max(0, level));
  if (familyConfig.levelNodeIds && familyConfig.levelNodeIds[clamped]) {
    return getSkillNode(familyConfig.levelNodeIds[clamped]);
  }
  const nodes = getNodesByFamily(familyConfig.familyId);
  if (nodes.length === 0) return undefined;
  const index = Math.min(nodes.length - 1, Math.round((clamped / 5) * (nodes.length - 1)));
  return nodes[index];
}

function realFamilyId(familyId: string): string {
  // HSPU is projected separately but lives inside the handstand family.
  return familyId === 'hspu' ? 'handstand' : familyId;
}

function incrementForExercise(config: ProjectionExerciseConfig, settings: ProjectionSettings): number {
  switch (config.loadType) {
    case 'barbell':
      return config.bodyRegion === 'lower' ? settings.lowerBodyIncrementKg : settings.upperBodyIncrementKg;
    case 'dumbbell':
      return settings.dumbbellIncrementKg;
    case 'machine':
      return settings.machineIncrementKg;
    case 'bodyweight':
      return settings.upperBodyIncrementKg;
    default:
      return 0;
  }
}

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return Number(value.toFixed(2));
  const rounded = Math.round(value / increment) * increment;
  return Math.max(0, Number(rounded.toFixed(2)));
}

function distributeRepTargets(min: number, max: number, count: number): number[] {
  // Projection starts every set at the bottom of the rep range and progresses reps first.
  return Array(count).fill(min);
}

function addRepsToAllSets(targets: number[], max: number): number[] {
  const next = targets.map((t) => Math.min(max, t + 1));
  return next;
}

function formatLoad(loadKg: number, loadType: ProjectionLoadType, unitSystem: UnitSystem): string {
  const unit = unitSystem === 'metric' ? 'kg' : 'lb';
  const value = unitSystem === 'metric' ? loadKg : loadKg * 2.20462;
  const rounded = Math.round(value * 10) / 10;
  const suffix = loadType === 'dumbbell' ? ` ${unit}/hand` : ` ${unit}`;
  return `${rounded}${suffix}`;
}

function progressGymState(
  state: { loadKg: number; repTargets: number[]; sets: number },
  config: ProjectionExerciseConfig,
  settings: ProjectionSettings
): { loadKg: number; repTargets: number[]; sets: number; decision: string } {
  const increment = incrementForExercise(config, settings);

  // Power and holds are not progressed by the projection layer.
  if (config.loadType === 'power' || config.loadType === 'hold') {
    return { ...state, decision: 'maintain' };
  }

  const allAtTop = state.repTargets.every((r) => r >= config.repRange.max);
  if (allAtTop) {
    return {
      loadKg: roundToIncrement(state.loadKg + increment, increment),
      repTargets: distributeRepTargets(config.repRange.min, config.repRange.max, state.sets),
      sets: state.sets,
      decision: 'add_load'
    };
  }

  return {
    ...state,
    repTargets: addRepsToAllSets(state.repTargets, config.repRange.max),
    decision: 'add_reps'
  };
}

function buildGymStates(
  input: ProjectionInput
): Map<string, { config: ProjectionExerciseConfig; state: { loadKg: number; repTargets: number[]; sets: number } }> {
  const loadMap = new Map(input.gymInputs.map((i) => [i.exerciseId, i.loadKg]));
  const states = new Map<
    string,
    { config: ProjectionExerciseConfig; state: { loadKg: number; repTargets: number[]; sets: number } }
  >();

  for (const config of PROJECTION_EXERCISE_CONFIG) {
    const userLoad = loadMap.get(config.exerciseId);
    const loadKg = userLoad !== undefined ? userLoad : config.defaultLoadKg;
    const sets = config.sets;
    const repTargets = config.holdSeconds
      ? Array(sets).fill(config.holdSeconds)
      : distributeRepTargets(config.repRange.min, config.repRange.max, sets);

    states.set(config.exerciseId, {
      config,
      state: { loadKg, repTargets, sets }
    });
  }

  return states;
}

function buildSkillStates(
  input: ProjectionInput
): Map<string, { config: ProjectionSkillFamilyConfig; node: SkillNode; index: number; nodes: SkillNode[] }> {
  const levelMap = new Map(input.skillLevels.map((s) => [s.familyId, s.level]));
  const states = new Map<string, { config: ProjectionSkillFamilyConfig; node: SkillNode; index: number; nodes: SkillNode[] }>();

  for (const config of PROJECTION_SKILL_FAMILIES) {
    const level = levelMap.get(config.familyId) ?? 0;
    const nodes = getNodesByFamily(realFamilyId(config.familyId));
    let node = skillFamilyNodeForLevel(config, level);
    if (!node && nodes.length > 0) {
      node = nodes[0];
    }
    const index = node ? nodes.findIndex((n) => n.id === node!.id) : 0;
    states.set(config.familyId, { config, node: node ?? nodes[0], index, nodes });
  }

  return states;
}

function priorityModifier(
  familyId: string,
  priorities?: ProjectionInput['skillPriorities']
): number {
  if (!priorities) return 0;
  if (priorities.primarySkillFamilyId === familyId) return -1;
  if (priorities.secondarySkillFamilyIds.includes(familyId)) return 0;
  if (priorities.maintenanceSkillFamilyIds.includes(familyId)) return 1;
  if (priorities.inactiveSkillFamilyIds.includes(familyId)) return 2;
  return 0;
}

function weeksPerStage(speed: ProjectionSpeed, familyId: string, priorities?: ProjectionInput['skillPriorities']): number {
  const base = speed === 'conservative' ? 4 : speed === 'moderate' ? 3 : 2;
  const mod = priorityModifier(familyId, priorities);
  return Math.max(1, base + mod);
}

function nextSkillAdvance(
  state: { config: ProjectionSkillFamilyConfig; node: SkillNode; index: number; nodes: SkillNode[] },
  weekNumber: number,
  speed: ProjectionSpeed,
  priorities?: ProjectionInput['skillPriorities']
): { node: SkillNode; index: number; nextLevelAt: number | null } {
  const rate = weeksPerStage(speed, state.config.familyId, priorities);
  const effectiveWeeks = Math.max(0, weekNumber - 1);
  const stagesGained = Math.floor(effectiveWeeks / rate);
  const nextIndex = Math.min(state.nodes.length - 1, state.index + stagesGained);
  const node = state.nodes[nextIndex];

  const weeksInStage = effectiveWeeks % rate;
  const weeksUntilNext = rate - weeksInStage;
  const nextLevelAt = nextIndex < state.nodes.length - 1 && weeksUntilNext > 0 ? weekNumber + weeksUntilNext : null;

  return { node, index: nextIndex, nextLevelAt };
}

function makeExerciseEntry(
  exerciseId: string,
  config: ProjectionExerciseConfig,
  state: { loadKg: number; repTargets: number[]; sets: number },
  isDeload: boolean,
  settings: ProjectionSettings
): ProjectedExerciseEntry {
  const catalog = getExerciseById(exerciseId);
  const displayName = catalog ? catalog.name : config.exerciseId.replace(/-/g, ' ');

  let entryLoad = state.loadKg;
  let entrySets = state.sets;
  let entryReps = [...state.repTargets];
  let notes = '';

  if (isDeload) {
    if (config.loadType !== 'power' && config.loadType !== 'hold' && config.loadType !== 'bodyweight') {
      entryLoad = roundToIncrement(state.loadKg * 0.9, incrementForExercise(config, settings));
      notes = 'Deload: reduced load.';
    } else if (config.loadType === 'bodyweight') {
      entrySets = Math.max(1, state.sets - 1);
      notes = 'Deload: reduced sets.';
    } else {
      notes = 'Deload: maintain technique.';
    }
    const mid = Math.round((config.repRange.min + config.repRange.max) / 2);
    entryReps = Array(entrySets).fill(Math.min(config.repRange.max, Math.max(config.repRange.min, mid)));
  }

  return {
    dayId: config.dayId,
    exerciseId,
    exerciseName: displayName,
    sets: entrySets,
    repTargets: entryReps,
    loadKg: entryLoad,
    loadDisplay: formatLoad(entryLoad, config.loadType, settings.unitSystem),
    holdSeconds: config.holdSeconds,
    isDeload,
    notes
  };
}

function makeSkillEntry(
  config: ProjectionSkillFamilyConfig,
  node: SkillNode,
  level: number,
  nextNodeId: string | null,
  nextLevelAt: number | null,
  isDeload: boolean
): ProjectedSkillEntry {
  return {
    familyId: config.familyId,
    familyName: config.name,
    nodeId: node.id,
    nodeName: node.name,
    level,
    targetSets: node.targetDose.sets ?? 1,
    targetRepsOrHoldSeconds:
      node.staticOrDynamic === 'static'
        ? (node.targetDose.holdSecondsMin ?? 0)
        : (node.targetDose.repsMin ?? 0),
    targetQuality: node.targetQuality,
    nextNodeId,
    nextLevelAt,
    isDeload,
    notes: isDeload ? 'Deload: maintain quality, no new progression.' : 'Projected drill based on starting level and speed.'
  };
}

export function generateProjection(input: ProjectionInput): ProjectionResult {
  const settings = input.settings;
  const curriculum = input.activeCurriculum ?? HYBRID_CURRICULUM;
  const gymStates = buildGymStates(input);
  const skillStates = buildSkillStates(input);
  const weeks: ProjectedWeek[] = [];
  const deloadWeeks: number[] = [];
  const warnings: string[] = [];

  const curriculumExerciseIds = new Set(curriculum.flatMap((d) => d.exercises.map((e) => e.exerciseId)));

  for (let week = 1; week <= settings.durationWeeks; week++) {
    const isDeload = settings.deloadFrequency > 0 && week % settings.deloadFrequency === 0;
    if (isDeload) deloadWeeks.push(week);

    const exerciseEntries: ProjectedExerciseEntry[] = [];
    for (const [exerciseId, { config, state }] of gymStates.entries()) {
      // Only include exercises that are in the active curriculum or were explicitly entered by the user.
      const userEntered = input.gymInputs.some((i) => i.exerciseId === exerciseId && i.loadKg > 0);
      if (!curriculumExerciseIds.has(exerciseId) && !userEntered) continue;

      exerciseEntries.push(makeExerciseEntry(exerciseId, config, state, isDeload, settings));

      if (!isDeload) {
        const next = progressGymState(state, config, settings);
        state.loadKg = next.loadKg;
        state.repTargets = next.repTargets;
        state.sets = next.sets;
      }
    }

    const skillEntries: ProjectedSkillEntry[] = [];
    for (const [familyId, state] of skillStates.entries()) {
      const advance = isDeload
        ? { node: state.node, index: state.index, nextLevelAt: null }
        : nextSkillAdvance(state, week, settings.speed, input.skillPriorities);
      const level = linearLevelForNode(advance.node, state.nodes);
      const nextNodeId = advance.node.progressions[0] ?? null;
      skillEntries.push(makeSkillEntry(state.config, advance.node, level, nextNodeId, advance.nextLevelAt, isDeload));
      if (!isDeload) {
        state.index = advance.index;
        state.node = advance.node;
      }
    }

    weeks.push({ weekNumber: week, isDeload, exerciseEntries, skillEntries });
  }

  warnings.push('Projected plan assumes perfect adherence, recovery, and technique.');
  warnings.push(`Deload weeks are planned every ${settings.deloadFrequency} weeks.`);
  if (settings.upperBodyIncrementKg > 5) {
    warnings.push('Upper-body load increment is large; real progression may be slower.');
  }
  if (settings.lowerBodyIncrementKg > 5) {
    warnings.push('Lower-body load increment is large; real progression may be slower.');
  }

  const summary = buildDashboardSummary(weeks, settings, input.skillPriorities?.primarySkillFamilyId ?? '');

  return {
    settings,
    weeks,
    deloadWeeks,
    warnings,
    dashboardSummary: summary
  };
}

function buildDashboardSummary(
  weeks: ProjectedWeek[],
  settings: ProjectionSettings,
  primaryFamilyId: string
): ProjectionDashboardSummary {
  const currentProjectedWeek = weeks.length > 0 ? 1 : 0;
  let nextProgression = 'Maintain current targets';
  let deloadWarning: string | null = null;

  if (weeks.length > 1) {
    const week1 = weeks[0];
    const week2 = weeks[1];
    const loadJump = week2.exerciseEntries.find((e2, idx) => {
      const e1 = week1.exerciseEntries[idx];
      return e1 && e2.loadKg > e1.loadKg;
    });
    if (loadJump) {
      nextProgression = `${loadJump.exerciseName} → ${loadJump.loadDisplay}`;
    } else {
      const repJump = week2.exerciseEntries.find((e2, idx) => {
        const e1 = week1.exerciseEntries[idx];
        if (!e1) return false;
        const sum1 = e1.repTargets.reduce((a, b) => a + b, 0);
        const sum2 = e2.repTargets.reduce((a, b) => a + b, 0);
        return sum2 > sum1;
      });
      if (repJump) {
        nextProgression = `${repJump.exerciseName} → ${repJump.repTargets.join('/')}`;
      }
    }
  }

  const nextDeload = weeks.find((w) => w.isDeload);
  if (nextDeload) {
    deloadWarning = `Deload planned in week ${nextDeload.weekNumber}`;
  }

  let primarySkillTarget = 'No primary skill selected';
  if (primaryFamilyId) {
    const firstWeek = weeks[0];
    const entry = firstWeek.skillEntries.find((s) => s.familyId === primaryFamilyId);
    if (entry) {
      primarySkillTarget = `${entry.familyName}: ${entry.nodeName}`;
    }
  }

  return {
    currentProjectedWeek,
    totalWeeks: settings.durationWeeks,
    nextProgression,
    deloadWarning,
    primarySkillTarget
  };
}

export function projectExerciseProgression(
  exerciseId: string,
  input: ProjectionInput
): Array<{ weekNumber: number; loadKg: number; repTargets: number[]; isDeload: boolean }> {
  const result = generateProjection(input);
  return result.weeks.map((w) => {
    const entry = w.exerciseEntries.find((e) => e.exerciseId === exerciseId);
    return {
      weekNumber: w.weekNumber,
      loadKg: entry?.loadKg ?? 0,
      repTargets: entry?.repTargets ?? [],
      isDeload: w.isDeload
    };
  });
}

export function projectSkillProgression(
  familyId: string,
  input: ProjectionInput
): Array<{ weekNumber: number; nodeName: string; level: number; target: string; isDeload: boolean }> {
  const result = generateProjection(input);
  return result.weeks.map((w) => {
    const entry = w.skillEntries.find((s) => s.familyId === familyId);
    return {
      weekNumber: w.weekNumber,
      nodeName: entry?.nodeName ?? '',
      level: entry?.level ?? 0,
      target: entry
        ? entry.targetRepsOrHoldSeconds > 0
          ? `${entry.targetSets} × ${entry.targetRepsOrHoldSeconds}s`
          : `${entry.targetSets} sets`
        : '',
      isDeload: w.isDeload
    };
  });
}

export function exportProjectionToCSV(result: ProjectionResult): string {
  const lines: string[] = ['Week,Day,Type,Name,Sets,Reps/Hold,Load,Deload,Notes'];
  for (const week of result.weeks) {
    for (const entry of week.exerciseEntries) {
      const reps = entry.holdSeconds ? `${entry.holdSeconds}s hold` : entry.repTargets.join(' / ');
      lines.push(
        `${week.weekNumber},${entry.dayId},Exercise,"${entry.exerciseName}",${entry.sets},"${reps}","${entry.loadDisplay}",${week.isDeload ? 'Yes' : 'No'},${entry.notes}`
      );
    }
    for (const entry of week.skillEntries) {
      const target = entry.targetRepsOrHoldSeconds > 0 ? `${entry.targetSets} × ${entry.targetRepsOrHoldSeconds}s` : `${entry.targetSets} sets`;
      lines.push(
        `${week.weekNumber},Skill,Skill,"${entry.familyName} — ${entry.nodeName}",${entry.targetSets},"${target}",-,${week.isDeload ? 'Yes' : 'No'},${entry.notes}`
      );
    }
  }
  return lines.join('\n');
}

export function exportProjectionToJSON(result: ProjectionResult): string {
  return JSON.stringify(
    {
      settings: result.settings,
      deloadWeeks: result.deloadWeeks,
      warnings: result.warnings,
      weeks: result.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        isDeload: w.isDeload,
        exerciseEntries: w.exerciseEntries,
        skillEntries: w.skillEntries
      }))
    },
    null,
    2
  );
}

export function nodeIdToProjectedLevel(familyId: string, nodeId: string): number {
  const nodes = getNodesByFamily(realFamilyId(familyId));
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return 0;
  return linearLevelForNode(node, nodes);
}

export function projectionExerciseIds(): string[] {
  return PROJECTION_EXERCISE_CONFIG.map((c) => c.exerciseId);
}

export function projectionSkillFamilyIds(): string[] {
  return PROJECTION_SKILL_FAMILIES.map((f) => f.familyId);
}

export function getProjectionExerciseConfig(exerciseId: string): ProjectionExerciseConfig | undefined {
  return PROJECTION_EXERCISE_CONFIG.find((c) => c.exerciseId === exerciseId);
}

export function getProjectionSkillFamilyConfig(familyId: string): ProjectionSkillFamilyConfig | undefined {
  return PROJECTION_SKILL_FAMILIES.find((f) => f.familyId === familyId);
}
