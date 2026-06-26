import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSkillStore } from '../stores/skillStore';
import { getCurrentUserId } from './auth';
import { syncPendingRecords, type SyncSkillAttempt, type SyncSupabaseClient } from './syncEngine';

export function useOfflineSync() {
  const pendingSets = useWorkoutStore((s) => s.pendingSets);
  const completedWorkouts = useWorkoutStore((s) => s.completedWorkouts);
  const progressionDecisions = useWorkoutStore((s) => s.progressionDecisions);
  const isOffline = useWorkoutStore((s) => s.isOffline);
  const setOffline = useWorkoutStore((s) => s.setOffline);
  const markSynced = useWorkoutStore((s) => s.markSynced);
  const setSyncStatus = useWorkoutStore((s) => s.setSyncStatus);
  const skillAttempts = useSkillStore((s) => s.attempts);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, [setOffline]);

  useEffect(() => {
    if (isOffline || pendingSets.length === 0) return;

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

        const result = await syncPendingRecords({
          userId,
          supabaseClient: supabase as unknown as SyncSupabaseClient,
          pendingSets,
          completedWorkouts,
          skillAttempts: mappedSkillAttempts,
          progressionDecisions
        });

        if (cancelled) return;

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
    markSynced,
    setOffline,
    setSyncStatus
  ]);
}
