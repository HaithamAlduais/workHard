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
  qualityDrop?: boolean;
  assistance?: string;
  leverageLevel?: string;
  loadPlacement?: string;
  apparatus?: string;
  grip?: string;
  modifiers?: Record<string, string>;
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
  pairType?: PairType;
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
    let type: PairType;
    if (isSolo) {
      type = exs[0].orderClass === 'TECHNIQUE_FIRST' || exs[0].orderClass === 'STRENGTH_SKILL'
        ? 'SKILL_CLUSTER'
        : 'STRAIGHT';
    } else if (exs.length > 1) {
      type = exs[0].pairType ?? 'ALT';
    } else {
      type = 'STRAIGHT';
    }
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

  const currentIdx = block.currentExerciseIndex;
  const currentEx = block.exercises[currentIdx];

  // Session-scoped completed counts. Only completed sets count toward targets.
  const setCounts = set.status === 'completed' ? 1 : 0;
  const completedCount = (ex: WorkoutExercise) =>
    getCompletedSets(ex.id).length + (ex.id === currentEx.id ? setCounts : 0);

  const allDone = block.exercises.every((ex) => completedCount(ex) >= ex.targetSets);

  if (block.type === 'STRAIGHT' || block.type === 'SKILL_CLUSTER') {
    if (block.type === 'SKILL_CLUSTER' && set.qualityDrop) {
      return {
        blockCompleted: true,
        nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
        nextExerciseIndex: 0,
        restSeconds: currentEx.restSeconds
      };
    }

    const currentExDone = completedCount(currentEx) >= currentEx.targetSets;
    if (currentExDone) {
      const nextIdx = currentIdx + 1;
      if (nextIdx < block.exercises.length) {
        const nextEx = block.exercises[nextIdx];
        return {
          blockCompleted: false,
          nextBlockIndex: state.currentBlockIndex,
          nextExerciseIndex: nextIdx,
          restSeconds: nextEx.restSeconds,
          pairTransition: true
        };
      }
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
      nextExerciseIndex: currentIdx,
      restSeconds: currentEx.restSeconds
    };
  }

  if (allDone) {
    return {
      blockCompleted: true,
      nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
      nextExerciseIndex: 0,
      restSeconds: currentEx.restSeconds
    };
  }

  const findNextRemaining = (startIdx: number): number => {
    for (let offset = 1; offset <= block.exercises.length; offset++) {
      const idx = (startIdx + offset) % block.exercises.length;
      const ex = block.exercises[idx];
      if (completedCount(ex) < ex.targetSets) return idx;
    }
    return -1;
  };

  const nextIdx = findNextRemaining(currentIdx);
  if (nextIdx === -1) {
    return {
      blockCompleted: true,
      nextBlockIndex: Math.min(state.currentBlockIndex + 1, state.blocks.length - 1),
      nextExerciseIndex: 0,
      restSeconds: currentEx.restSeconds
    };
  }

  const nextEx = block.exercises[nextIdx];

  if (block.type === 'ALT') {
    return {
      blockCompleted: false,
      nextBlockIndex: state.currentBlockIndex,
      nextExerciseIndex: nextIdx,
      restSeconds: nextEx.restSeconds,
      pairTransition: nextIdx !== currentIdx
    };
  }

  // SS
  if (nextIdx === currentIdx) {
    return {
      blockCompleted: false,
      nextBlockIndex: state.currentBlockIndex,
      nextExerciseIndex: nextIdx,
      restSeconds: currentEx.restSeconds
    };
  }

  const fullRound = currentIdx === block.exercises.length - 1;
  return {
    blockCompleted: false,
    nextBlockIndex: state.currentBlockIndex,
    nextExerciseIndex: nextIdx,
    restSeconds: fullRound ? nextEx.restSeconds : 15,
    pairTransition: true
  };
}
