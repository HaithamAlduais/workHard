import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSkillStore } from '../stores/skillStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { getCurrentUserId } from './auth';
import {
  syncPendingRecords,
  type SyncSkillAttempt,
  type SyncSupabaseClient,
  type SyncExercisePrescription,
  type SyncSkillPrescription
} from './syncEngine';

export function useOfflineSync() {
  const pendingSets = useWorkoutStore((s) => s.pendingSets);
  const completedWorkouts = useWorkoutStore((s) => s.completedWorkouts);
  const progressionDecisions = useWorkoutStore((s) => s.progressionDecisions);
  const isOffline = useWorkoutStore((s) => s.isOffline);
  const setOffline = useWorkoutStore((s) => s.setOffline);
  const markSynced = useWorkoutStore((s) => s.markSynced);
  const setSyncStatus = useWorkoutStore((s) => s.setSyncStatus);
  const skillAttempts = useSkillStore((s) => s.attempts);

  const pendingExerciseCount = usePrescriptionStore(
    (s) => Object.keys(s.pendingExercisePrescriptions).length
  );
  const pendingSkillCount = usePrescriptionStore(
    (s) => Object.keys(s.pendingSkillPrescriptions).length
  );
  const markExercisePrescriptionsSynced = usePrescriptionStore((s) => s.markExercisePrescriptionsSynced);
  const markSkillPrescriptionsSynced = usePrescriptionStore((s) => s.markSkillPrescriptionsSynced);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, [setOffline]);

  useEffect(() => {
    if (isOffline || (pendingSets.length === 0 && pendingExerciseCount === 0 && pendingSkillCount === 0)) return;

    let cancelled = false;

    const sync = async () => {
      setSyncStatus('syncing');
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          if (!cancelled) setSyncStatus('error');
          return;
        }

        const mappedSkillAttempts: SyncSkillAttempt[] = skillAttempts.map((attempt) => ({
          id: attempt.id,
          userId,
          skillNodeId: attempt.skillNodeId,
          workoutSessionId: attempt.workoutSessionId,
          completedAt: attempt.completedAt,
          repetitions: attempt.repetitions,
          holdSeconds: attempt.holdSeconds,
          validHoldSeconds: attempt.validHoldSeconds,
          externalLoadKg: attempt.externalLoadKg,
          assistance: attempt.assistance,
          leverageLevel: attempt.leverageLevel,
          loadPlacement: attempt.loadPlacement,
          apparatus: attempt.apparatus,
          grip: attempt.grip,
          modifiers: attempt.modifiers,
          qualityScore: attempt.qualityScore,
          qualityDimensions: attempt.qualityDimensions,
          painLevel: attempt.painLevel,
          fullRom: attempt.fullRom,
          videoVerified: attempt.videoVerified,
          coachVerified: attempt.coachVerified,
          selfReported: !attempt.videoVerified && !attempt.coachVerified
        }));

        const {
          exercisePrescriptions,
          skillPrescriptions,
          pendingExercisePrescriptions,
          pendingSkillPrescriptions
        } = usePrescriptionStore.getState();

        const mappedExercisePrescriptions: SyncExercisePrescription[] = Object.entries(
          pendingExercisePrescriptions
        )
          .filter(([, pending]) => pending)
          .map(([key]) => {
            const p = exercisePrescriptions[key];
            if (!p) return null;
            return {
              userId,
              exerciseId: p.exercise_id,
              programDayId: p.program_day_id,
              currentLoad: p.currentLoad,
              nextLoad: p.nextLoad,
              setCount: p.setCount,
              targetRepRange: p.targetRepRange,
              exactNextTargets: p.exactNextTargets,
              targetRIR: p.targetRIR,
              restSeconds: p.restSeconds,
              bodyRegion: p.bodyRegion,
              smallestPlateKg: p.smallestPlateKg,
              progressionState: p.progressionState,
              lastCompletedSessionId: p.lastCompletedSessionId,
              lastDecisionId: p.lastDecisionId,
              activeDeload: p.activeDeload,
              activeSetAddition: p.activeSetAddition,
              overrideStatus: (p as any).overrideStatus,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              clientId: p.client_id
            } as SyncExercisePrescription;
          })
          .filter((p): p is SyncExercisePrescription => p !== null);

        const mappedSkillPrescriptions: SyncSkillPrescription[] = Object.entries(pendingSkillPrescriptions)
          .filter(([, pending]) => pending)
          .map(([nodeId]) => {
            const p = skillPrescriptions[nodeId];
            if (!p) return null;
            return {
              userId,
              skillNodeId: p.skill_node_id,
              skillFamilyId: p.skill_family_id,
              currentNode: p.currentNode,
              nextCandidateNode: p.nextCandidateNode,
              targetSets: p.targetSets,
              targetRepsOrHoldSeconds: p.targetRepsOrHoldSeconds,
              assistance: p.assistance,
              leverageLevel: p.leverageLevel,
              externalLoad: p.externalLoad,
              loadPlacement: p.loadPlacement,
              apparatus: p.apparatus,
              grip: p.grip,
              modifiers: p.modifiers,
              qualityTarget: p.qualityTarget,
              requiredSuccessfulExposures: p.requiredSuccessfulExposures,
              progressionState: p.progressionState,
              lastCompletedExposure: p.lastCompletedExposure,
              activeSafetyHold: p.activeSafetyHold,
              overrideStatus: (p as any).overrideStatus,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              clientId: p.client_id
            } as SyncSkillPrescription;
          })
          .filter((p): p is SyncSkillPrescription => p !== null);

        const result = await syncPendingRecords({
          userId,
          supabaseClient: supabase as unknown as SyncSupabaseClient,
          pendingSets,
          completedWorkouts,
          skillAttempts: mappedSkillAttempts,
          progressionDecisions,
          pendingExercisePrescriptions: mappedExercisePrescriptions,
          pendingSkillPrescriptions: mappedSkillPrescriptions
        });

        if (cancelled) return;

        if (result.exercisePrescriptions.success.length > 0) {
          markExercisePrescriptionsSynced(result.exercisePrescriptions.success);
        }

        if (result.skillPrescriptions.success.length > 0) {
          markSkillPrescriptionsSynced(result.skillPrescriptions.success);
        }

        if (result.sessions.success.length > 0) {
          const syncedSetIds = pendingSets
            .filter((set) => set.workoutSessionId && result.sessions.success.includes(set.workoutSessionId))
            .map((set) => set.id);
          markSynced(syncedSetIds);
        } else {
          setSyncStatus(result.errors.length > 0 ? 'error' : 'idle');
        }
      } catch (e) {
        if (!cancelled) setSyncStatus('error');
      }
    };

    const timer = setTimeout(sync, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isOffline,
    pendingSets.length,
    completedWorkouts.length,
    skillAttempts.length,
    progressionDecisions.length,
    pendingExerciseCount,
    pendingSkillCount,
    markSynced,
    markExercisePrescriptionsSynced,
    markSkillPrescriptionsSynced,
    setOffline,
    setSyncStatus
  ]);
}
