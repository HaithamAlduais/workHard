import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HYBRID_CURRICULUM,
  SKILL_NODES,
  createExercisePrescription,
  createSkillPrescription,
  applyStrengthDecision,
  applyHypertrophyDecision,
  applySkillDecision,
  getSkillNode,
  updateSkillPrescriptionStatuses,
  type ExercisePrescription,
  type SkillPrescription,
  type OverrideRecord,
  type StrengthDecision,
  type HypertrophyDecision,
  type SkillDecision,
  type SessionOrderClass,
  type ActiveWorkoutState,
  type WorkoutExercise
} from '@gravitypath/domain';
import { bodyRegionFor } from '../lib/prescriptions';
import type { CalibrationState } from './calibrationStore';
import { useSkillPriorityStore } from './skillPriorityStore';
import { useSkillStore } from './skillStore';
import type { ProgressionDecision } from './workoutStore';

export type ExercisePrescriptionWithMeta = ExercisePrescription & {
  orderClass: SessionOrderClass;
  role: string;
  targetRepsOrHoldSeconds?: number;
};

export type SkillPrescriptionWithMeta = SkillPrescription & {
  lastDecisionId?: string | null;
};

export interface ReplacementRecord {
  id: string;
  exerciseId: string;
  calisthenicsNodeId: string;
  percentage: number;
  reason: string;
  approvedAt: string;
  status: 'active' | 'rejected' | 'superseded' | 'deferred';
  rejectedAt?: string;
  deferredAt?: string;
}

interface PrescriptionState {
  exercisePrescriptions: Record<string, ExercisePrescriptionWithMeta>;
  skillPrescriptions: Record<string, SkillPrescriptionWithMeta>;
  pendingExercisePrescriptions: Record<string, boolean>;
  pendingSkillPrescriptions: Record<string, boolean>;
  replacementHistory: ReplacementRecord[];
  activeReplacements: Record<string, ReplacementRecord>;
  initialized: boolean;
  // actions
  initializePrescriptions: (userId: string, calibration?: CalibrationState) => void;
  getExercisePrescription: (dayId: string, exerciseId: string) => ExercisePrescriptionWithMeta | undefined;
  getSkillPrescription: (nodeId: string) => SkillPrescriptionWithMeta | undefined;
  applyProgressionDecisions: (decisions: ProgressionDecision[], dayId: string, sessionId: string) => void;
  overrideExercisePrescription: (dayId: string, exerciseId: string, override: OverrideRecord) => void;
  overrideSkillPrescription: (nodeId: string, override: OverrideRecord) => void;
  markExercisePrescriptionsSynced: (keys: string[]) => void;
  markSkillPrescriptionsSynced: (nodeIds: string[]) => void;
  applyPrescriptionsToWorkout: (workout: ActiveWorkoutState) => ActiveWorkoutState;
  recomputeSkillStatuses: () => void;
  approveReplacement: (record: ReplacementRecord) => void;
  rejectReplacement: (exerciseId: string) => void;
  deferReplacement: (exerciseId: string) => void;
  supersedeReplacement: (exerciseId: string) => void;
  getActiveReplacement: (exerciseId: string) => ReplacementRecord | undefined;
  isOnCooldown: (exerciseId: string, cooldownDays?: number) => boolean;
}

const GYM_DECISION_TYPES = new Set(['ADD_REPS', 'ADD_LOAD', 'REDUCE_LOAD', 'MAINTAIN_LOAD', 'HOLD_FOR_SAFETY']);
const POWER_DECISION_TYPES = new Set(['CONTINUE', 'STOP_VELOCITY_DROP', 'REDUCE_VOLUME']);

function isGymDecision(type: string): boolean {
  return GYM_DECISION_TYPES.has(type);
}

function isSkillDecision(type: string): boolean {
  return !isGymDecision(type) && !POWER_DECISION_TYPES.has(type);
}

function mapSkillDecisionType(type: string): string {
  if (type === 'ADVANCE_LEVERAGE') return 'INCREASE_LEVERAGE';
  return type;
}

export const usePrescriptionStore = create<PrescriptionState>()(
  persist(
    (set, get) => ({
      exercisePrescriptions: {},
      skillPrescriptions: {},
      pendingExercisePrescriptions: {},
      pendingSkillPrescriptions: {},
      replacementHistory: [],
      activeReplacements: {},
      initialized: false,

      initializePrescriptions: (userId, calibration) => {
        set((state) => {
          const exercisePrescriptions: Record<string, ExercisePrescriptionWithMeta> = { ...state.exercisePrescriptions };
          const skillPrescriptions: Record<string, SkillPrescriptionWithMeta> = { ...state.skillPrescriptions };

          for (const day of HYBRID_CURRICULUM) {
            for (const ex of day.exercises) {
              const key = `${day.id}|${ex.exerciseId}`;
              if (exercisePrescriptions[key]) continue;

              const prescription = createExercisePrescription({
                userId,
                programDayId: day.id,
                exerciseId: ex.exerciseId,
                exerciseSpec: {
                  targetLoadKg: ex.targetLoadKg ?? 0,
                  setCount: ex.targetSets,
                  targetRepRange: {
                    min: ex.targetRepsMin ?? 1,
                    max: ex.targetRepsMax ?? 1
                  },
                  targetRIR: 2,
                  restSeconds: ex.restSeconds
                },
                bodyRegion: bodyRegionFor(ex.exerciseId),
                smallestPlateKg: 1.25,
                calibrationLoad: calibration?.getCalibrationLoad(ex.exerciseId),
                clientId: `${userId}|${day.id}|${ex.exerciseId}`
              }) as ExercisePrescriptionWithMeta;

              prescription.orderClass = ex.orderClass;
              prescription.role = ex.role;
              if (ex.targetHoldSeconds !== undefined) {
                prescription.targetRepsOrHoldSeconds = ex.targetHoldSeconds;
              }

              exercisePrescriptions[key] = prescription;
            }
          }

          for (const node of SKILL_NODES) {
            if (skillPrescriptions[node.id]) continue;
            const startingNodeId = calibration?.skillStartingNodesByFamily[node.familyId];
            const prescription = createSkillPrescription({
              userId,
              node,
              startingNodeId,
              clientId: `${userId}|${node.id}`
            }) as SkillPrescriptionWithMeta;
            skillPrescriptions[node.id] = prescription;
          }

          return {
            ...state,
            exercisePrescriptions,
            skillPrescriptions,
            initialized: true
          };
        });
      },

      getExercisePrescription: (dayId, exerciseId) => {
        return get().exercisePrescriptions[`${dayId}|${exerciseId}`];
      },

      getSkillPrescription: (nodeId) => {
        return get().skillPrescriptions[nodeId];
      },

      applyProgressionDecisions: (decisions, dayId, sessionId) => {
        set((state) => {
          const exercisePrescriptions = { ...state.exercisePrescriptions };
          const skillPrescriptions = { ...state.skillPrescriptions };
          const pendingExercisePrescriptions = { ...state.pendingExercisePrescriptions };
          const pendingSkillPrescriptions = { ...state.pendingSkillPrescriptions };

          for (const decision of decisions) {
            const decisionId = `${sessionId}|${decision.exerciseId}|${decision.decisionType}`;

            if (isGymDecision(decision.decisionType)) {
              const key = `${dayId}|${decision.exerciseId}`;
              const prescription = exercisePrescriptions[key];
              if (!prescription) continue;

              const isStrength = prescription.orderClass === 'GYM_STRENGTH' || prescription.role === 'strength';
              const reason = decision.reason;
              const newLoadKg = decision.newTarget?.loadKg ?? prescription.currentLoad;
              let domainDecision: StrengthDecision | HypertrophyDecision;

              switch (decision.decisionType) {
                case 'ADD_REPS':
                  domainDecision = { type: 'ADD_REPS', addedReps: 1, reason };
                  break;
                case 'ADD_LOAD':
                  domainDecision = { type: 'ADD_LOAD', newLoadKg, incrementKg: 0, reason };
                  break;
                case 'REDUCE_LOAD':
                  domainDecision = { type: 'REDUCE_LOAD', newLoadKg, reductionPercent: 0, reason };
                  break;
                case 'HOLD_FOR_SAFETY':
                  domainDecision = { type: 'HOLD_FOR_SAFETY', reason };
                  break;
                case 'MAINTAIN_LOAD':
                default:
                  domainDecision = { type: 'MAINTAIN_LOAD', reason };
                  break;
              }

              const updated = (
                isStrength
                  ? applyStrengthDecision(prescription, domainDecision)
                  : applyHypertrophyDecision(prescription, domainDecision)
              ) as ExercisePrescriptionWithMeta;
              updated.lastCompletedSessionId = sessionId;
              updated.lastDecisionId = decisionId;

              exercisePrescriptions[key] = updated;
              pendingExercisePrescriptions[key] = true;
            } else if (isSkillDecision(decision.decisionType)) {
              let skillPrescription = skillPrescriptions[decision.exerciseId];
              if (!skillPrescription) {
                for (const p of Object.values(skillPrescriptions)) {
                  if (p.currentNode === decision.exerciseId) {
                    skillPrescription = p;
                    break;
                  }
                }
              }
              if (!skillPrescription) continue;

              const mappedType = mapSkillDecisionType(decision.decisionType);
              const reason = decision.reason;
              const targetNodeId = decision.targetNodeId;
              let skillDecision: SkillDecision;

              switch (mappedType) {
                case 'ADD_REP':
                  skillDecision = { type: 'ADD_REP', reason };
                  break;
                case 'ADD_HOLD_TIME':
                  skillDecision = { type: 'ADD_HOLD_TIME', reason };
                  break;
                case 'ADD_QUALITY_TARGET':
                  skillDecision = { type: 'ADD_QUALITY_TARGET', reason };
                  break;
                case 'REDUCE_ASSISTANCE':
                  skillDecision = { type: 'REDUCE_ASSISTANCE', reason };
                  break;
                case 'INCREASE_LEVERAGE':
                  skillDecision = { type: 'INCREASE_LEVERAGE', reason };
                  break;
                case 'ADD_LOAD':
                  skillDecision = { type: 'ADD_LOAD', reason };
                  break;
                case 'ADD_SET':
                  skillDecision = { type: 'ADD_SET', reason };
                  break;
                case 'REMOVE_SET':
                  skillDecision = { type: 'REMOVE_SET', reason };
                  break;
                case 'REGRESS_NODE':
                  skillDecision = { type: 'REGRESS_NODE', targetNodeId: targetNodeId ?? skillPrescription.currentNode, reason };
                  break;
                case 'UNLOCK_NEXT_NODE':
                  skillDecision = {
                    type: 'UNLOCK_NEXT_NODE',
                    targetNodeId: targetNodeId ?? skillPrescription.nextCandidateNode ?? skillPrescription.skill_node_id,
                    reason
                  };
                  break;
                case 'HOLD_FOR_SAFETY':
                  skillDecision = { type: 'HOLD_FOR_SAFETY', reason };
                  break;
                case 'REQUIRE_VIDEO_CONFIRMATION':
                  skillDecision = { type: 'REQUIRE_VIDEO_CONFIRMATION', reason };
                  break;
                case 'REQUIRE_COACH_CONFIRMATION':
                  skillDecision = { type: 'REQUIRE_COACH_CONFIRMATION', reason };
                  break;
                case 'DELOAD_SKILL':
                  skillDecision = { type: 'DELOAD_SKILL', reason };
                  break;
                case 'STOP_BLOCK_DUE_TO_QUALITY_DROP':
                  skillDecision = { type: 'STOP_BLOCK_DUE_TO_QUALITY_DROP', reason };
                  break;
                case 'MAINTAIN_NODE':
                default:
                  skillDecision = { type: 'MAINTAIN_NODE', reason };
                  break;
              }

              const updated = applySkillDecision(skillPrescription, skillDecision) as SkillPrescriptionWithMeta;
              updated.lastCompletedExposure = sessionId;
              updated.lastDecisionId = decisionId;

              skillPrescriptions[skillPrescription.skill_node_id] = updated;
              pendingSkillPrescriptions[skillPrescription.skill_node_id] = true;
            }
            // Power decisions are intentionally skipped.
          }

          return {
            ...state,
            exercisePrescriptions,
            skillPrescriptions,
            pendingExercisePrescriptions,
            pendingSkillPrescriptions
          };
        });
      },

      overrideExercisePrescription: (dayId, exerciseId, override) => {
        const key = `${dayId}|${exerciseId}`;
        set((state) => {
          const prescription = state.exercisePrescriptions[key];
          if (!prescription) return state;
          return {
            ...state,
            exercisePrescriptions: {
              ...state.exercisePrescriptions,
              [key]: { ...prescription, overrideStatus: override, updatedAt: new Date() }
            },
            pendingExercisePrescriptions: { ...state.pendingExercisePrescriptions, [key]: true }
          };
        });
      },

      overrideSkillPrescription: (nodeId, override) => {
        set((state) => {
          const prescription = state.skillPrescriptions[nodeId];
          if (!prescription) return state;
          return {
            ...state,
            skillPrescriptions: {
              ...state.skillPrescriptions,
              [nodeId]: { ...prescription, overrideStatus: override, updatedAt: new Date() } as SkillPrescriptionWithMeta
            },
            pendingSkillPrescriptions: { ...state.pendingSkillPrescriptions, [nodeId]: true }
          };
        });
      },

      markExercisePrescriptionsSynced: (keys) => {
        set((state) => {
          const pendingExercisePrescriptions = { ...state.pendingExercisePrescriptions };
          for (const key of keys) {
            delete pendingExercisePrescriptions[key];
          }
          return { ...state, pendingExercisePrescriptions };
        });
      },

      markSkillPrescriptionsSynced: (nodeIds) => {
        set((state) => {
          const pendingSkillPrescriptions = { ...state.pendingSkillPrescriptions };
          for (const nodeId of nodeIds) {
            delete pendingSkillPrescriptions[nodeId];
          }
          return { ...state, pendingSkillPrescriptions };
        });
      },

      recomputeSkillStatuses: () => {
        set((state) => {
          const priority = useSkillPriorityStore.getState();
          const unlockStates = useSkillStore.getState().getUnlockStates();
          const statuses = updateSkillPrescriptionStatuses(priority, state.skillPrescriptions, unlockStates);
          const skillPrescriptions = { ...state.skillPrescriptions };
          for (const [nodeId, status] of Object.entries(statuses)) {
            const existing = skillPrescriptions[nodeId];
            if (existing) {
              skillPrescriptions[nodeId] = { ...existing, status };
            }
          }
          return { ...state, skillPrescriptions };
        });
      },

      approveReplacement: (record) => {
        set((state) => {
          const activeReplacements = { ...state.activeReplacements, [record.exerciseId]: record };
          const replacementHistory = [...state.replacementHistory];
          // Mark any previous active record for the same exercise as superseded.
          const previous = state.activeReplacements[record.exerciseId];
          if (previous) {
            const idx = replacementHistory.findIndex((r) => r.id === previous.id);
            if (idx >= 0) {
              replacementHistory[idx] = { ...previous, status: 'superseded' };
            }
          }
          replacementHistory.push(record);
          return { ...state, activeReplacements, replacementHistory };
        });
      },

      rejectReplacement: (exerciseId) => {
        set((state) => {
          const activeReplacements = { ...state.activeReplacements };
          const previous = activeReplacements[exerciseId];
          delete activeReplacements[exerciseId];
          const replacementHistory = [...state.replacementHistory];
          if (previous) {
            replacementHistory.push({
              ...previous,
              status: 'rejected',
              rejectedAt: new Date().toISOString()
            });
          }
          return { ...state, activeReplacements, replacementHistory };
        });
      },

      deferReplacement: (exerciseId) => {
        set((state) => {
          const activeReplacements = { ...state.activeReplacements };
          const previous = activeReplacements[exerciseId];
          delete activeReplacements[exerciseId];
          const replacementHistory = [...state.replacementHistory];
          if (previous) {
            replacementHistory.push({
              ...previous,
              status: 'deferred',
              deferredAt: new Date().toISOString()
            });
          }
          return { ...state, activeReplacements, replacementHistory };
        });
      },

      supersedeReplacement: (exerciseId) => {
        set((state) => {
          const activeReplacements = { ...state.activeReplacements };
          const previous = activeReplacements[exerciseId];
          delete activeReplacements[exerciseId];
          if (!previous) return { ...state, activeReplacements };
          const replacementHistory = [...state.replacementHistory];
          const idx = replacementHistory.findIndex((r) => r.id === previous.id);
          if (idx >= 0) {
            replacementHistory[idx] = { ...previous, status: 'superseded' };
          }
          return { ...state, activeReplacements, replacementHistory };
        });
      },

      getActiveReplacement: (exerciseId) => {
        return get().activeReplacements[exerciseId];
      },

      isOnCooldown: (exerciseId, cooldownDays = 7) => {
        const cutoff = Date.now() - cooldownDays * 24 * 60 * 60 * 1000;
        return get().replacementHistory.some(
          (r) =>
            r.exerciseId === exerciseId &&
            r.status === 'rejected' &&
            r.rejectedAt !== undefined &&
            new Date(r.rejectedAt).getTime() >= cutoff
        );
      },

      applyPrescriptionsToWorkout: (workout) => {
        const { exercisePrescriptions, skillPrescriptions } = get();
        const dayId = workout.programDayId;

        const blocks = workout.blocks.map((block) => ({
          ...block,
          exercises: block.exercises.map((ex) => {
            const skillNode = getSkillNode(ex.exerciseId);
            if (skillNode) {
              const prescription = skillPrescriptions[ex.exerciseId];
              if (!prescription) return ex;

              const updated: WorkoutExercise = { ...ex };
              updated.targetLoadKg = prescription.externalLoad;
              updated.targetSets = prescription.targetSets;

              if (ex.targetHoldSeconds !== undefined) {
                updated.targetHoldSeconds = prescription.targetRepsOrHoldSeconds;
              } else {
                updated.targetRepsMin = prescription.targetRepsOrHoldSeconds;
              }

              return updated;
            }

            const key = `${dayId}|${ex.exerciseId}`;
            const prescription = exercisePrescriptions[key];
            if (!prescription) return ex;

            const updated: WorkoutExercise = { ...ex };
            updated.targetLoadKg = prescription.currentLoad;
            let setCount = prescription.setCount;
            if (ex.replacementPercentage !== undefined && ex.replacementPercentage > 0 && ex.replacementPercentage < 100) {
              setCount = Math.max(1, Math.round(setCount * (100 - ex.replacementPercentage) / 100));
            }
            updated.targetSets = setCount;

            if (ex.targetHoldSeconds !== undefined) {
              updated.targetHoldSeconds = prescription.targetRepsOrHoldSeconds ?? ex.targetHoldSeconds;
            } else {
              updated.targetRepsMin = prescription.targetRepRange.min;
              updated.targetRepsMax = prescription.targetRepRange.max;
            }

            return updated;
          })
        }));

        return { ...workout, blocks };
      }
    }),
    {
      name: 'gravitypath-prescriptions',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
