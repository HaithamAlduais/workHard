import type { PairType, SessionOrderClass } from '../types.js';

export type SetResultStatus = 'pending' | 'completed' | 'skipped' | 'stopped_pain';

export interface LoggedSet {
  id: string;
  blockId: string;
  exerciseId: string;
  workoutSessionId?: string;
  setNumber: number;
  loadKg: number;
  reps: number;
  rir: number;
  holdSeconds: number;
  rom: 'full' | 'partial' | 'assisted';
  form: 'good' | 'acceptable' | 'poor';
  painLevel: 0 | 1 | 2 | 3;
  powerQuality?: 'fast' | 'acceptable' | 'slower';
  restSeconds: number;
  completedAt?: string;
  pendingSync: boolean;
  status: SetResultStatus;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  nameAr: string;
  orderClass: SessionOrderClass;
  pairId?: string;
  role: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetLoadKg?: number;
  targetHoldSeconds?: number;
  restSeconds: number;
}

export interface WorkoutBlock {
  id: string;
  type: PairType;
  orderIndex: number;
  orderClass: SessionOrderClass;
  exercises: WorkoutExercise[];
  currentExerciseIndex: number;
  completed: boolean;
}

export interface ActiveWorkoutState {
  id: string;
  programDayId: string;
  dayName: string;
  dayNameAr: string;
  startedAt: string;
  completedAt?: string;
  status: 'idle' | 'active' | 'completed';
  blocks: WorkoutBlock[];
  currentBlockIndex: number;
  elapsedSeconds: number;
}

export function buildBlocks(exercises: WorkoutExercise[]): WorkoutBlock[] {
  const byPair = new Map<string | undefined, WorkoutExercise[]>();
  for (const ex of exercises) {
    const key = ex.pairId ?? `solo-${ex.id}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(ex);
  }

  const blocks: WorkoutBlock[] = [];
  let orderIndex = 0;
  for (const [pairId, exs] of byPair) {
    const isSolo = pairId?.startsWith('solo-');
    const type: PairType = isSolo
      ? exs[0].orderClass === 'TECHNIQUE_FIRST' || exs[0].orderClass === 'STRENGTH_SKILL'
        ? 'SKILL_CLUSTER'
        : 'STRAIGHT'
      : exs.length > 1
        ? 'ALT'
        : 'STRAIGHT';
    blocks.push({
      id: isSolo ? pairId!.replace('solo-', '') : pairId ?? `block-${orderIndex}`,
      type,
      orderIndex: orderIndex++,
      orderClass: exs[0].orderClass,
      exercises: exs,
      currentExerciseIndex: 0,
      completed: false
    });
  }
  return blocks.sort((a, b) => a.orderIndex - b.orderIndex);
}

export function currentExercise(state: ActiveWorkoutState): WorkoutExercise | undefined {
  const block = state.blocks[state.currentBlockIndex];
  if (!block) return undefined;
  return block.exercises[block.currentExerciseIndex];
}

export function currentBlock(state: ActiveWorkoutState): WorkoutBlock | undefined {
  return state.blocks[state.currentBlockIndex];
}

export interface NextSetResult {
  blockCompleted: boolean;
  nextBlockIndex: number;
  nextExerciseIndex: number;
  restSeconds: number;
  pairTransition?: boolean;
}

export function advanceAfterSet(
  state: ActiveWorkoutState,
  set: LoggedSet,
  getCompletedSets: (exerciseId: string) => LoggedSet[]
): NextSetResult {
  const block = state.blocks[state.currentBlockIndex];
  if (!block) {
    return { blockCompleted: true, nextBlockIndex: state.currentBlockIndex, nextExerciseIndex: 0, restSeconds: 0 };
  }

  const currentEx = block.exercises[block.currentExerciseIndex];
  const setsForCurrent = [...getCompletedSets(currentEx.id), set];
  const currentExDone = setsForCurrent.length >= currentEx.targetSets;

  if (block.type === 'STRAIGHT' || block.type === 'SKILL_CLUSTER') {
    if (currentExDone) {
      return {
        blockCompleted: true,
        nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
        nextExerciseIndex: 0,
        restSeconds: currentEx.restSeconds
      };
    }
    return {
      blockCompleted: false,
      nextBlockIndex: state.currentBlockIndex,
      nextExerciseIndex: block.currentExerciseIndex,
      restSeconds: currentEx.restSeconds
    };
  }

  if (block.type === 'ALT') {
    if (currentExDone) {
      const nextExIndex = block.currentExerciseIndex + 1;
      if (nextExIndex >= block.exercises.length) {
        return {
          blockCompleted: true,
          nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
          nextExerciseIndex: 0,
          restSeconds: currentEx.restSeconds
        };
      }
      return {
        blockCompleted: false,
        nextBlockIndex: state.currentBlockIndex,
        nextExerciseIndex: nextExIndex,
        restSeconds: currentEx.restSeconds,
        pairTransition: true
      };
    }
    const nextExIndex = (block.currentExerciseIndex + 1) % block.exercises.length;
    return {
      blockCompleted: false,
      nextBlockIndex: state.currentBlockIndex,
      nextExerciseIndex: nextExIndex,
      restSeconds: currentEx.restSeconds,
      pairTransition: true
    };
  }

  // SS: perform all sets of first exercise, then all sets of second, short transition between exercises, rest after pair
  if (block.type === 'SS') {
    if (currentExDone) {
      const nextExIndex = block.currentExerciseIndex + 1;
      if (nextExIndex >= block.exercises.length) {
        return {
          blockCompleted: true,
          nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
          nextExerciseIndex: 0,
          restSeconds: currentEx.restSeconds
        };
      }
      return {
        blockCompleted: false,
        nextBlockIndex: state.currentBlockIndex,
        nextExerciseIndex: nextExIndex,
        restSeconds: 15,
        pairTransition: true
      };
    }
    return {
      blockCompleted: false,
      nextBlockIndex: state.currentBlockIndex,
      nextExerciseIndex: block.currentExerciseIndex,
      restSeconds: 15
    };
  }

  return { blockCompleted: false, nextBlockIndex: state.currentBlockIndex, nextExerciseIndex: block.currentExerciseIndex, restSeconds: currentEx.restSeconds };
}
