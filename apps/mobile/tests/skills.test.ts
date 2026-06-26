import { describe, it, expect } from 'vitest';
import { setsToUserSkillAttempts } from '../lib/skills';
import type { LoggedSet } from '@gravitypath/domain';

describe('setsToUserSkillAttempts', () => {
  it('records assistance, leverage, load placement, apparatus, grip and modifiers from the set', () => {
    const set: LoggedSet = {
      id: 'set-1',
      blockId: 'B',
      exerciseId: 'handstand-wall',
      workoutSessionId: 'ws-1',
      setNumber: 1,
      loadKg: 0,
      reps: 0,
      rir: 0,
      holdSeconds: 25,
      rom: 'full',
      form: 'good',
      painLevel: 0,
      assistance: 'wall',
      leverageLevel: 'full',
      loadPlacement: 'none',
      apparatus: 'wall',
      grip: 'none',
      modifiers: { wallDistance: '10cm' },
      restSeconds: 60,
      completedAt: new Date().toISOString(),
      pendingSync: true,
      status: 'completed'
    };
    const attempts = setsToUserSkillAttempts([set], 'ws-1');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].assistance).toBe('wall');
    expect(attempts[0].leverageLevel).toBe('full');
    expect(attempts[0].loadPlacement).toBe('none');
    expect(attempts[0].apparatus).toBe('wall');
    expect(attempts[0].grip).toBe('none');
    expect(attempts[0].modifiers).toEqual({ wallDistance: '10cm' });
  });

  it('does not record an assisted rep as full ROM / unassisted', () => {
    const set: LoggedSet = {
      id: 'set-2',
      blockId: 'B',
      exerciseId: 'assisted-pull-up',
      workoutSessionId: 'ws-1',
      setNumber: 1,
      loadKg: 0,
      reps: 5,
      rir: 2,
      holdSeconds: 0,
      rom: 'assisted',
      form: 'good',
      painLevel: 0,
      assistance: 'band',
      leverageLevel: 'full',
      loadPlacement: 'none',
      restSeconds: 90,
      completedAt: new Date().toISOString(),
      pendingSync: true,
      status: 'completed'
    };
    const attempts = setsToUserSkillAttempts([set], 'ws-1');
    expect(attempts[0].fullRom).toBe(false);
    expect(attempts[0].assistance).toBe('band');
  });

  it('deduplicates attempts with the same generated id', () => {
    const set: LoggedSet = {
      id: 'set-3',
      blockId: 'B',
      exerciseId: 'l-sit',
      workoutSessionId: 'ws-1',
      setNumber: 1,
      loadKg: 0,
      reps: 0,
      rir: 0,
      holdSeconds: 12,
      rom: 'full',
      form: 'good',
      painLevel: 0,
      restSeconds: 45,
      completedAt: new Date().toISOString(),
      pendingSync: true,
      status: 'completed'
    };
    // Simulate recording the same set twice
    const store = { attempts: [] as any[] };
    const first = setsToUserSkillAttempts([set], 'ws-1');
    store.attempts.push(...first);
    const existingIds = new Set(store.attempts.map((a) => a.id));
    const second = setsToUserSkillAttempts([set], 'ws-1');
    const newAttempts = second.filter((a) => !existingIds.has(a.id));
    expect(newAttempts).toHaveLength(0);
  });
});
