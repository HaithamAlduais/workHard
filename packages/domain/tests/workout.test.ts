import { describe, it, expect } from 'vitest';
import {
  buildBlocks,
  advanceAfterSet,
  type WorkoutExercise,
  type WorkoutBlock,
  type ActiveWorkoutState,
  type LoggedSet
} from '../src/workout/state.js';
import { startWorkoutState } from '../src/programs/curriculum.js';

function makeExercise(overrides: Partial<WorkoutExercise> & Pick<WorkoutExercise, 'id'>): WorkoutExercise {
  return {
    exerciseId: overrides.id,
    name: overrides.id,
    nameAr: overrides.id,
    orderClass: 'GYM_STRENGTH',
    role: 'strength',
    targetSets: 3,
    restSeconds: 90,
    ...overrides
  } as WorkoutExercise;
}

function makeSet(
  overrides: Partial<LoggedSet> & Pick<LoggedSet, 'id' | 'exerciseId' | 'blockId' | 'setNumber'>
): LoggedSet {
  return {
    loadKg: 0,
    reps: 1,
    rir: 2,
    holdSeconds: 0,
    rom: 'full',
    form: 'good',
    painLevel: 0,
    restSeconds: 0,
    pendingSync: false,
    status: 'completed',
    ...overrides
  } as LoggedSet;
}

function makeState(
  exercises: WorkoutExercise[],
  overrides?: Partial<ActiveWorkoutState>
): ActiveWorkoutState {
  return {
    id: 'ws-test',
    programDayId: 'day-test',
    dayName: 'Test Day',
    dayNameAr: 'يوم اختبار',
    startedAt: new Date().toISOString(),
    status: 'active',
    blocks: buildBlocks(exercises),
    currentBlockIndex: 0,
    elapsedSeconds: 0,
    ...overrides
  };
}

type SessionLog = Map<string, LoggedSet[]>;

function sessionGetter(log: SessionLog) {
  return (exerciseId: string) => log.get(exerciseId) ?? [];
}

function recordSet(log: SessionLog, set: LoggedSet) {
  const arr = log.get(set.exerciseId) ?? [];
  arr.push(set);
  log.set(set.exerciseId, arr);
}

describe('buildBlocks', () => {
  it('keeps solo skill work as SKILL_CLUSTER', () => {
    const ex = makeExercise({ id: 'hs1', orderClass: 'TECHNIQUE_FIRST', targetSets: 5, restSeconds: 60 });
    const state = makeState([ex]);
    expect(state.blocks[0].type).toBe('SKILL_CLUSTER');
  });

  it('keeps other solo work as STRAIGHT', () => {
    const ex = makeExercise({ id: 'sq1', orderClass: 'GYM_STRENGTH', targetSets: 3, restSeconds: 240 });
    const state = makeState([ex]);
    expect(state.blocks[0].type).toBe('STRAIGHT');
  });

  it('uses declared pairType for paired blocks', () => {
    const a = makeExercise({ id: 'lc1', pairId: 'C', pairType: 'SS', targetSets: 2, restSeconds: 75 });
    const b = makeExercise({ id: 'lr1', pairId: 'C', pairType: 'SS', targetSets: 2, restSeconds: 75 });
    const state = makeState([a, b]);
    expect(state.blocks[0].type).toBe('SS');
  });

  it('defaults paired blocks with no pairType to ALT', () => {
    const a = makeExercise({ id: 'wpu1', pairId: 'B', targetSets: 3, restSeconds: 90 });
    const b = makeExercise({ id: 'bp1', pairId: 'B', targetSets: 3, restSeconds: 90 });
    const state = makeState([a, b]);
    expect(state.blocks[0].type).toBe('ALT');
  });
});

describe('advanceAfterSet', () => {
  it('STRAIGHT: same exercise for all targetSets, then block completes', () => {
    const ex = makeExercise({ id: 'a', targetSets: 3, restSeconds: 90 });
    const state = makeState([ex]);
    const blockId = state.blocks[0].id;
    const log: SessionLog = new Map();

    const s1 = makeSet({ id: 's1', exerciseId: 'a', blockId, setNumber: 1 });
    const r1 = advanceAfterSet(state, s1, sessionGetter(log));
    expect(r1.blockCompleted).toBe(false);
    expect(r1.nextExerciseIndex).toBe(0);
    expect(r1.restSeconds).toBe(90);
    recordSet(log, s1);

    const s2 = makeSet({ id: 's2', exerciseId: 'a', blockId, setNumber: 2 });
    const r2 = advanceAfterSet(state, s2, sessionGetter(log));
    expect(r2.blockCompleted).toBe(false);
    expect(r2.nextExerciseIndex).toBe(0);
    expect(r2.restSeconds).toBe(90);
    recordSet(log, s2);

    const s3 = makeSet({ id: 's3', exerciseId: 'a', blockId, setNumber: 3 });
    const r3 = advanceAfterSet(state, s3, sessionGetter(log));
    expect(r3.blockCompleted).toBe(true);
    expect(r3.restSeconds).toBe(90);
  });

  it('ALT: alternates exercises every set and uses the next exercise rest', () => {
    const a = makeExercise({ id: 'a', pairId: 'P', pairType: 'ALT', targetSets: 3, restSeconds: 90 });
    const b = makeExercise({ id: 'b', pairId: 'P', pairType: 'ALT', targetSets: 3, restSeconds: 60 });
    const state = makeState([a, b]);
    const blockId = state.blocks[0].id;
    const log: SessionLog = new Map();

    function step(setNumber: number, exId: 'a' | 'b', expectedNext: 'a' | 'b', expectedRest: number) {
      const set = makeSet({ id: `s${setNumber}`, exerciseId: exId, blockId, setNumber });
      state.blocks[0].currentExerciseIndex = state.blocks[0].exercises.findIndex((e) => e.id === exId);
      const result = advanceAfterSet(state, set, sessionGetter(log));
      recordSet(log, set);
      state.blocks[0].currentExerciseIndex = result.nextExerciseIndex;
      expect(result.blockCompleted).toBe(false);
      expect(state.blocks[0].exercises[result.nextExerciseIndex].id).toBe(expectedNext);
      expect(result.restSeconds).toBe(expectedRest);
      return result;
    }

    step(1, 'a', 'b', 60);
    step(2, 'b', 'a', 90);
    step(3, 'a', 'b', 60);
    step(4, 'b', 'a', 90);
    step(5, 'a', 'b', 60);

    const last = makeSet({ id: 's6', exerciseId: 'b', blockId, setNumber: 6 });
    const result = advanceAfterSet(state, last, sessionGetter(log));
    expect(result.blockCompleted).toBe(true);
    expect(result.restSeconds).toBe(60);
  });

  it('SS: alternates C1, C2, C1, C2 with transition rest and prescribed rest after a full round', () => {
    const c1 = makeExercise({ id: 'c1', pairId: 'P', pairType: 'SS', targetSets: 2, restSeconds: 75 });
    const c2 = makeExercise({ id: 'c2', pairId: 'P', pairType: 'SS', targetSets: 2, restSeconds: 60 });
    const state = makeState([c1, c2]);
    const blockId = state.blocks[0].id;
    const log: SessionLog = new Map();

    const s1 = makeSet({ id: 's1', exerciseId: 'c1', blockId, setNumber: 1 });
    state.blocks[0].currentExerciseIndex = 0;
    const r1 = advanceAfterSet(state, s1, sessionGetter(log));
    expect(r1.nextExerciseIndex).toBe(1);
    expect(r1.restSeconds).toBe(15);
    recordSet(log, s1);
    state.blocks[0].currentExerciseIndex = r1.nextExerciseIndex;

    const s2 = makeSet({ id: 's2', exerciseId: 'c2', blockId, setNumber: 1 });
    const r2 = advanceAfterSet(state, s2, sessionGetter(log));
    expect(r2.nextExerciseIndex).toBe(0);
    expect(r2.restSeconds).toBe(75); // full round completed, upcoming c1 prescribed rest
    recordSet(log, s2);
    state.blocks[0].currentExerciseIndex = r2.nextExerciseIndex;

    const s3 = makeSet({ id: 's3', exerciseId: 'c1', blockId, setNumber: 2 });
    const r3 = advanceAfterSet(state, s3, sessionGetter(log));
    expect(r3.nextExerciseIndex).toBe(1);
    expect(r3.restSeconds).toBe(15);
    recordSet(log, s3);
    state.blocks[0].currentExerciseIndex = r3.nextExerciseIndex;

    const s4 = makeSet({ id: 's4', exerciseId: 'c2', blockId, setNumber: 2 });
    const r4 = advanceAfterSet(state, s4, sessionGetter(log));
    expect(r4.blockCompleted).toBe(true);
    expect(r4.restSeconds).toBe(60);
  });

  it('SKILL_CLUSTER: stops early when qualityDrop is true', () => {
    const ex = makeExercise({ id: 'sk1', orderClass: 'STRENGTH_SKILL', targetSets: 5, restSeconds: 45 });
    const state = makeState([ex]);
    const blockId = state.blocks[0].id;
    const log: SessionLog = new Map();

    const s1 = makeSet({ id: 's1', exerciseId: 'sk1', blockId, setNumber: 1 });
    const r1 = advanceAfterSet(state, s1, sessionGetter(log));
    expect(r1.blockCompleted).toBe(false);
    expect(r1.nextExerciseIndex).toBe(0);
    expect(r1.restSeconds).toBe(45);

    const s2 = makeSet({ id: 's2', exerciseId: 'sk1', blockId, setNumber: 2, qualityDrop: true });
    const r2 = advanceAfterSet(state, s2, sessionGetter(log));
    expect(r2.blockCompleted).toBe(true);
    expect(r2.restSeconds).toBe(45);
  });

  it('historical sets from another session do not affect current session completion', () => {
    const ex = makeExercise({ id: 'x', targetSets: 2, restSeconds: 60 });
    const state = makeState([ex]);
    const blockId = state.blocks[0].id;

    // Simulated historical sets from a previous workout; they are not in the session-scoped log.
    const historicalSets: LoggedSet[] = [
      makeSet({ id: 'h1', exerciseId: 'x', blockId, setNumber: 1 }),
      makeSet({ id: 'h2', exerciseId: 'x', blockId, setNumber: 2 })
    ];

    const sessionLog: SessionLog = new Map();

    const s1 = makeSet({ id: 's1', exerciseId: 'x', blockId, setNumber: 1 });
    const r1 = advanceAfterSet(state, s1, sessionGetter(sessionLog));
    expect(r1.blockCompleted).toBe(false);
    recordSet(sessionLog, s1);

    const s2 = makeSet({ id: 's2', exerciseId: 'x', blockId, setNumber: 2 });
    const r2 = advanceAfterSet(state, s2, sessionGetter(sessionLog));
    recordSet(sessionLog, s2);
    expect(r2.blockCompleted).toBe(true);

    // Confirm the callback only sees the current-session sets, not historical data.
    expect(historicalSets).toHaveLength(2);
    expect(sessionGetter(sessionLog)('x')).toHaveLength(2);
  });
});

describe('curriculum integration', () => {
  it('pairType from curriculum produces SS blocks', () => {
    const state = startWorkoutState('day1');
    const blockById = new Map<string, WorkoutBlock>(state.blocks.map((b) => [b.id, b]));
    expect(blockById.get('C')?.type).toBe('SS');
    expect(blockById.get('D')?.type).toBe('SS');
    expect(blockById.get('E')?.type).toBe('SS');
    expect(blockById.get('B')?.type).toBe('ALT');
  });
});
