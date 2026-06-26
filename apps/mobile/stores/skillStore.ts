import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SKILL_NODES, buildUnlockGraph, evaluateSkillUnlock, type SkillNode, type SkillUnlockState } from '@gravitypath/domain';

export interface UserSkillAttempt {
  skillNodeId: string;
  workoutSessionId?: string;
  completedAt: string;
  repetitions?: number;
  holdSeconds?: number;
  validHoldSeconds?: number;
  externalLoadKg: number;
  assistance: string;
  leverageLevel: string;
  loadPlacement: string;
  qualityScore: number;
  qualityDimensions: {
    bodyLine: number;
    scapularPosition: number;
    elbowPosition: number;
    symmetry: number;
    stability: number;
    momentum: number;
    rom: number;
    control: number;
  };
  painLevel: number;
  fullRom: boolean;
  videoVerified: boolean;
  coachVerified: boolean;
}

interface SkillState {
  attempts: UserSkillAttempt[];
  unlockOverrides: Record<string, SkillUnlockState['status']>;
  recordAttempt: (attempt: UserSkillAttempt) => void;
  setUnlockOverride: (nodeId: string, status: SkillUnlockState['status']) => void;
  getUnlockStates: () => Map<string, SkillUnlockState>;
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      attempts: [],
      unlockOverrides: {},

      recordAttempt: (attempt) => {
        set((state) => ({
          attempts: [...state.attempts, attempt]
        }));
      },

      setUnlockOverride: (nodeId, status) => {
        set((state) => ({
          unlockOverrides: { ...state.unlockOverrides, [nodeId]: status }
        }));
      },

      getUnlockStates: () => {
        const { attempts, unlockOverrides } = get();
        const attemptsByNode = new Map<string, UserSkillAttempt[]>();
        for (const a of attempts) {
          const list = attemptsByNode.get(a.skillNodeId) ?? [];
          list.push(a);
          attemptsByNode.set(a.skillNodeId, list);
        }

        const domainAttempts = new Map<string, any[]>();
        for (const [nodeId, list] of attemptsByNode) {
          domainAttempts.set(
            nodeId,
            list.map((a) => ({
              id: `${nodeId}-${a.completedAt}`,
              userId: 'local',
              skillNodeId: a.skillNodeId,
              workoutSessionId: a.workoutSessionId,
              completedAt: new Date(a.completedAt),
              repetitions: a.repetitions,
              holdSeconds: a.holdSeconds,
              validHoldSeconds: a.validHoldSeconds,
              externalLoadKg: a.externalLoadKg,
              assistance: a.assistance,
              leverageLevel: a.leverageLevel,
              loadPlacement: a.loadPlacement,
              qualityScore: a.qualityScore,
              qualityDimensions: a.qualityDimensions,
              painLevel: a.painLevel,
              fullRom: a.fullRom,
              videoVerified: a.videoVerified,
              coachVerified: a.coachVerified,
              selfReported: !a.videoVerified && !a.coachVerified
            }))
          );
        }

        const states = buildUnlockGraph(SKILL_NODES, domainAttempts);
        for (const [nodeId, override] of Object.entries(unlockOverrides)) {
          const state = states.get(nodeId);
          if (state) {
            state.status = override;
            state.reason = 'Manually adjusted by user/coach';
          }
        }
        return states;
      }
    }),
    {
      name: 'gravitypath-skills',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
