import { buildBlocks, type WorkoutExercise } from '../workout/state.js';
import type { ActiveWorkoutState } from '../workout/state.js';
import type { PairType, SessionOrderClass, TimeBlock } from '../types.js';
import type { SkillSlot, SkillPriority, GenerateSkillSlotsOptions } from '../skills/skillSlots.js';
import { generateSkillSlotsForDay } from '../skills/skillSlots.js';
import { buildTimeBudget } from '../time-budget/engine.js';

interface ProgramExerciseSpec {
  id: string;
  exerciseId: string;
  name: string;
  nameAr: string;
  orderClass: SessionOrderClass;
  pairId?: string;
  pairType?: PairType;
  role: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetLoadKg?: number;
  targetHoldSeconds?: number;
  restSeconds: number;
}

interface ProgramDay {
  id: string;
  name: string;
  nameAr: string;
  targetDurationMinutes: number;
  exercises: ProgramExerciseSpec[];
}

const SKILL_ORDER_CLASSES: Set<SessionOrderClass> = new Set([
  'TECHNIQUE_FIRST',
  'STRENGTH_SKILL',
  'HYPERTROPHY_SKILL'
]);

export const HYBRID_CURRICULUM: ProgramDay[] = [
  {
    id: 'day1',
    name: 'Day 1 — Push Skill, Squat, Weighted Pull',
    nameAr: 'اليوم 1 — مهارة الدفع، القرفصاء، السحب بالوزن',
    targetDurationMinutes: 58,
    exercises: [
      { id: 'hs1', exerciseId: 'handstand-wall', name: 'Chest-to-wall Handstand', nameAr: 'وقوف على اليدين بالجدار', orderClass: 'TECHNIQUE_FIRST', role: 'technique', targetSets: 5, targetHoldSeconds: 30, restSeconds: 60 },
      { id: 'bj1', exerciseId: 'box-jump', name: 'Box Jump', nameAr: 'قفز على صندوق', orderClass: 'POWER', role: 'power', targetSets: 3, targetRepsMin: 3, targetRepsMax: 3, restSeconds: 90 },
      { id: 'sq1', exerciseId: 'back-squat', name: 'Back Squat', nameAr: 'قرفصاء خلفية', orderClass: 'GYM_STRENGTH', role: 'strength', targetSets: 3, targetRepsMin: 3, targetRepsMax: 5, targetLoadKg: 80, restSeconds: 240 },
      { id: 'wpu1', exerciseId: 'weighted-pull-up', name: 'Weighted Pull-up', nameAr: 'سحب مع وزن', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 15, restSeconds: 90 },
      { id: 'bp1', exerciseId: 'bench-press', name: 'Barbell Bench Press', nameAr: 'ضغط صدر بالبار', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 80, restSeconds: 90 },
      { id: 'lc1', exerciseId: 'seated-leg-curl', name: 'Seated Leg Curl', nameAr: 'ثني ركبة جالس', orderClass: 'GYM_HYPERTROPHY', pairId: 'C', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 75 },
      { id: 'lr1', exerciseId: 'cable-lateral-raise', name: 'Cable Lateral Raise', nameAr: 'رفع جانبي بالكابل', orderClass: 'ACCESSORY', pairId: 'C', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 12, targetRepsMax: 20, restSeconds: 75 },
      { id: 'ez1', exerciseId: 'ez-curl', name: 'EZ-bar Curl', nameAr: 'كيرل بالبار EZ', orderClass: 'ACCESSORY', pairId: 'D', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 75 },
      { id: 'tp1', exerciseId: 'triceps-pressdown', name: 'Rope Triceps Pressdown', nameAr: 'ضغط ثلاثي بالحبل', orderClass: 'ACCESSORY', pairId: 'D', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 75 },
      { id: 'cr1', exerciseId: 'standing-calf-raise', name: 'Standing Calf Raise', nameAr: 'رفع سمانة واقف', orderClass: 'ACCESSORY', pairId: 'E', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 8, targetRepsMax: 15, restSeconds: 75 },
      { id: 'fc1', exerciseId: 'farmers-carry', name: 'Farmers Carry', nameAr: 'حمل المزارع', orderClass: 'ACCESSORY', pairId: 'E', pairType: 'SS', role: 'strength', targetSets: 2, targetHoldSeconds: 25, restSeconds: 75 }
    ]
  },
  {
    id: 'day2',
    name: 'Day 2 — Muscle-up or Rings, Deadlift, Overhead Strength',
    nameAr: 'اليوم 2 — العضلة العكسية أو الحلقات، الرفعة الميتة، قوة الكتف',
    targetDurationMinutes: 58,
    exercises: [
      { id: 'mu1', exerciseId: 'muscle-up', name: 'Strict Bar Muscle-up', nameAr: 'عضلة عكسية صارمة', orderClass: 'STRENGTH_SKILL', role: 'skill', targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, restSeconds: 90 },
      { id: 'mt1', exerciseId: 'medicine-ball-throw', name: 'Medicine-ball Chest Throw', nameAr: 'رمي كرة طبية', orderClass: 'POWER', role: 'power', targetSets: 3, targetRepsMin: 4, targetRepsMax: 4, restSeconds: 75 },
      { id: 'dl1', exerciseId: 'trap-bar-deadlift', name: 'Trap-bar Deadlift', nameAr: 'رفعة ميتة ببار سداسي', orderClass: 'GYM_STRENGTH', role: 'strength', targetSets: 3, targetRepsMin: 3, targetRepsMax: 5, targetLoadKg: 120, restSeconds: 240 },
      { id: 'oh1', exerciseId: 'overhead-press', name: 'Standing Overhead Press', nameAr: 'دفع كتف واقف', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 50, restSeconds: 90 },
      { id: 'sr1', exerciseId: 'chest-supported-row', name: 'Chest-supported Row', nameAr: 'سحب مدعوم بالصدر', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 6, targetRepsMax: 8, targetLoadKg: 60, restSeconds: 90 },
      { id: 'hs2', exerciseId: 'hack-squat', name: 'Hack Squat', nameAr: 'قرفصاء هاك', orderClass: 'GYM_HYPERTROPHY', pairId: 'C', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 90 },
      { id: 'll1', exerciseId: 'lying-leg-curl', name: 'Lying Leg Curl', nameAr: 'ثني ركبة مستلق', orderClass: 'GYM_HYPERTROPHY', pairId: 'C', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
      { id: 'rp1', exerciseId: 'ring-push-up', name: 'Ring Push-up', nameAr: 'ضغط بالحلقات', orderClass: 'HYPERTROPHY_SKILL', pairId: 'D', pairType: 'SS', role: 'skill', targetSets: 3, targetRepsMin: 6, targetRepsMax: 12, restSeconds: 90 },
      { id: 'pd1', exerciseId: 'lat-pulldown', name: 'Lat Pulldown', nameAr: 'سحب علوي', orderClass: 'GYM_HYPERTROPHY', pairId: 'D', pairType: 'SS', role: 'hypertrophy', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
      { id: 'pp1', exerciseId: 'plate-pinch', name: 'Plate Pinch', nameAr: 'قرص القبضة', orderClass: 'ACCESSORY', role: 'hypertrophy', targetSets: 2, targetHoldSeconds: 25, restSeconds: 60 }
    ]
  },
  {
    id: 'day3',
    name: 'Day 3 — Lever or Pistol Skill, Front Squat, Incline Strength',
    nameAr: 'اليوم 3 — مهارة الرافعة أو البستول، القرفصاء الأمامية، القوة المائلة',
    targetDurationMinutes: 58,
    exercises: [
      { id: 'tf1', exerciseId: 'tuck-front-lever', name: 'Tuck Front Lever', nameAr: 'رافعة أمامية مطوية', orderClass: 'STRENGTH_SKILL', role: 'skill', targetSets: 4, targetHoldSeconds: 8, restSeconds: 60 },
      { id: 'ls1', exerciseId: 'l-sit', name: 'L-sit', nameAr: 'جلوس L', orderClass: 'STRENGTH_SKILL', role: 'skill', targetSets: 3, targetHoldSeconds: 15, restSeconds: 45 },
      { id: 'tj1', exerciseId: 'trap-bar-jump', name: 'Trap-bar Jump', nameAr: 'قفز بالبار السداسي', orderClass: 'POWER', role: 'power', targetSets: 3, targetRepsMin: 3, targetRepsMax: 3, restSeconds: 105 },
      { id: 'fs1', exerciseId: 'front-squat', name: 'Front Squat', nameAr: 'قرفصاء أمامية', orderClass: 'GYM_STRENGTH', role: 'strength', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 70, restSeconds: 180 },
      { id: 'ip1', exerciseId: 'low-incline-press', name: 'Low-incline Bench Press', nameAr: 'ضغط مائل منخفض', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 70, restSeconds: 90 },
      { id: 'lp1', exerciseId: 'lat-pulldown', name: 'Lat Pulldown', nameAr: 'سحب علوي', orderClass: 'GYM_STRENGTH', pairId: 'B', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 90 },
      { id: 'rd1', exerciseId: 'romanian-deadlift', name: 'Romanian Deadlift', nameAr: 'رفعة رومانية', orderClass: 'GYM_HYPERTROPHY', pairId: 'C', pairType: 'ALT', role: 'strength', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetLoadKg: 80, restSeconds: 90 },
      { id: 'rp2', exerciseId: 'reverse-pec-deck', name: 'Reverse Pec Deck', nameAr: 'بيك ديك عكسي', orderClass: 'ACCESSORY', pairId: 'C', pairType: 'ALT', role: 'hypertrophy', targetSets: 2, targetRepsMin: 12, targetRepsMax: 20, restSeconds: 90 },
      { id: 'le1', exerciseId: 'leg-extension', name: 'Leg Extension', nameAr: 'بسط الركبة', orderClass: 'ACCESSORY', pairId: 'D', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 75 },
      { id: 'lr2', exerciseId: 'cable-lateral-raise', name: 'Cable Lateral Raise', nameAr: 'رفع جانبي بالكابل', orderClass: 'ACCESSORY', pairId: 'D', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 12, targetRepsMax: 20, restSeconds: 75 },
      { id: 'rc1', exerciseId: 'reverse-curl', name: 'Reverse Curl', nameAr: 'كيرل عكسي', orderClass: 'ACCESSORY', pairId: 'E', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 75 },
      { id: 'ct1', exerciseId: 'cable-triceps-pressdown', name: 'Cable Triceps Pressdown', nameAr: 'ضغط ثلاثي بالكابل', orderClass: 'ACCESSORY', pairId: 'E', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 75 },
      { id: 'sc1', exerciseId: 'single-leg-calf-raise', name: 'Single-leg Calf Raise', nameAr: 'رفع سمانة برجل واحدة', orderClass: 'ACCESSORY', pairId: 'F', pairType: 'SS', role: 'hypertrophy', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 75 },
      { id: 'td1', exerciseId: 'towel-dead-hang', name: 'Towel Dead Hang', nameAr: 'تعليق بالمنشفة', orderClass: 'ACCESSORY', pairId: 'F', pairType: 'SS', role: 'hypertrophy', targetSets: 2, targetHoldSeconds: 25, restSeconds: 75 }
    ]
  }
];

export function getProgramDay(dayId: string): ProgramDay | undefined {
  return HYBRID_CURRICULUM.find((d) => d.id === dayId);
}

function tierForOrderClass(orderClass: SessionOrderClass): TimeBlock['tier'] {
  switch (orderClass) {
    case 'PREPARATION':
    case 'TECHNIQUE_FIRST':
    case 'STRENGTH_SKILL':
    case 'HYPERTROPHY_SKILL':
      return 1;
    case 'POWER':
    case 'GYM_STRENGTH':
      return 2;
    case 'GYM_HYPERTROPHY':
      return 3;
    case 'ACCESSORY':
      return 4;
    case 'RECOVERY':
      return 5;
    default:
      return 3;
  }
}

function estimateSlotMinutes(slot: SkillSlot): number {
  const workPerSet =
    slot.targetHoldSeconds ??
    (slot.targetRepsMin !== undefined && slot.targetRepsMax !== undefined
      ? (slot.targetRepsMin + slot.targetRepsMax) / 2 * 3
      : 30);
  const transitionSeconds = 120;
  return Math.ceil((slot.targetSets * workPerSet + (slot.targetSets - 1) * slot.restSeconds + transitionSeconds) / 60);
}

function estimateExerciseMinutes(ex: ProgramExerciseSpec): number {
  const workPerSet =
    ex.targetHoldSeconds ??
    (ex.targetRepsMin !== undefined && ex.targetRepsMax !== undefined
      ? (ex.targetRepsMin + ex.targetRepsMax) / 2 * 3
      : 30);
  const transitionSeconds = 90;
  return Math.ceil((ex.targetSets * workPerSet + (ex.targetSets - 1) * ex.restSeconds + transitionSeconds) / 60);
}

export interface HybridProgramDayOptions extends GenerateSkillSlotsOptions {
  availableMinutes?: number;
}

export interface HybridProgramDayResult {
  day: ProgramDay;
  removedBlocks: TimeBlock[];
  warnings: string[];
  totalMinutes: number;
}

export function getHybridProgramDay(dayId: string, options: HybridProgramDayOptions): HybridProgramDayResult {
  const baseDay = getProgramDay(dayId) ?? HYBRID_CURRICULUM[0];
  const stableExercises = baseDay.exercises.filter((ex) => !SKILL_ORDER_CLASSES.has(ex.orderClass));
  const skillSlots = generateSkillSlotsForDay(dayId, options);
  const availableMinutes = options.availableMinutes ?? 60;

  const blocks: TimeBlock[] = [];
  for (const slot of skillSlots) {
    blocks.push({
      id: slot.id,
      orderClass: slot.orderClass,
      tier: 1,
      estimatedMinutes: estimateSlotMinutes(slot),
      minRestSeconds: slot.restSeconds,
      exercises: [slot.exerciseId],
      required: true
    });
  }

  for (const ex of stableExercises) {
    blocks.push({
      id: ex.id,
      orderClass: ex.orderClass,
      tier: tierForOrderClass(ex.orderClass),
      estimatedMinutes: estimateExerciseMinutes(ex),
      minRestSeconds: ex.restSeconds,
      exercises: [ex.exerciseId],
      required: ex.orderClass === 'POWER' || ex.orderClass === 'GYM_STRENGTH' || ex.orderClass === 'PREPARATION'
    });
  }

  const decision = buildTimeBudget({ blocks, availableMinutes });
  const removedIds = new Set(decision.removedBlocks.map((b) => b.id));

  const keptSlots = skillSlots.filter((s) => !removedIds.has(s.id));
  const keptStable = stableExercises.filter((e) => !removedIds.has(e.id));

  const exercises: ProgramExerciseSpec[] = [
    ...keptSlots.map((slot) => ({
      id: slot.id,
      exerciseId: slot.exerciseId,
      name: slot.name,
      nameAr: slot.nameAr,
      orderClass: slot.orderClass,
      pairId: slot.pairId,
      pairType: slot.pairType,
      role: slot.role,
      targetSets: slot.targetSets,
      targetRepsMin: slot.targetRepsMin,
      targetRepsMax: slot.targetRepsMax,
      targetHoldSeconds: slot.targetHoldSeconds,
      restSeconds: slot.restSeconds
    })),
    ...keptStable
  ];

  return {
    day: {
      ...baseDay,
      targetDurationMinutes: decision.totalMinutes,
      exercises
    },
    removedBlocks: decision.removedBlocks,
    warnings: decision.warnings,
    totalMinutes: decision.totalMinutes
  };
}

function workoutExercisesFromProgramDay(day: ProgramDay): WorkoutExercise[] {
  return day.exercises.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    name: e.name,
    nameAr: e.nameAr,
    orderClass: e.orderClass,
    pairId: e.pairId,
    pairType: e.pairType,
    role: e.role,
    targetSets: e.targetSets,
    targetRepsMin: e.targetRepsMin,
    targetRepsMax: e.targetRepsMax,
    targetLoadKg: e.targetLoadKg,
    targetHoldSeconds: e.targetHoldSeconds,
    restSeconds: e.restSeconds
  }));
}

export function startWorkoutState(dayId: string, overrides?: Partial<ActiveWorkoutState>): ActiveWorkoutState {
  const day = getProgramDay(dayId) ?? HYBRID_CURRICULUM[0];
  const exercises = workoutExercisesFromProgramDay(day);
  return {
    id: `ws-${Date.now()}`,
    programDayId: day.id,
    dayName: day.name,
    dayNameAr: day.nameAr,
    startedAt: new Date().toISOString(),
    status: 'active',
    blocks: buildBlocks(exercises),
    currentBlockIndex: 0,
    elapsedSeconds: 0,
    ...overrides
  };
}

export function startWorkoutStateWithSkillSlots(
  dayId: string,
  options: HybridProgramDayOptions,
  overrides?: Partial<ActiveWorkoutState>
): ActiveWorkoutState {
  const { day, warnings } = getHybridProgramDay(dayId, options);
  const exercises = workoutExercisesFromProgramDay(day);
  return {
    id: `ws-${Date.now()}`,
    programDayId: day.id,
    dayName: day.name,
    dayNameAr: day.nameAr,
    startedAt: new Date().toISOString(),
    status: 'active',
    blocks: buildBlocks(exercises),
    currentBlockIndex: 0,
    elapsedSeconds: 0,
    warnings,
    ...overrides
  };
}

export function allProgramDayIds(): string[] {
  return HYBRID_CURRICULUM.map((d) => d.id);
}
