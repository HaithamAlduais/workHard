import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useWorkoutStore } from '../stores/workoutStore';

export function useOfflineSync() {
  const { pendingSets, isOffline, setOffline, markSynced, setSyncStatus } = useWorkoutStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline || pendingSets.length === 0) return;

    let cancelled = false;
    const sync = async () => {
      setSyncStatus('syncing');
      try {
        const syncedIds: string[] = [];
        for (const set of pendingSets) {
          const { error } = await supabase.from('set_logs').insert({
            id: set.id,
            load_kg: set.loadKg,
            repetitions: set.reps,
            rir: set.rir,
            rom: set.rom,
            form: set.form,
            pain_level: set.painLevel,
            rest_seconds_actual: set.restSeconds,
            completed_at: set.completedAt,
            client_id: set.id
          });
          if (!error) {
            syncedIds.push(set.id);
          } else if ((error as any).code === '23505') {
            // duplicate
            syncedIds.push(set.id);
          } else {
            throw error;
          }
        }
        if (!cancelled) markSynced(syncedIds);
      } catch (e) {
        if (!cancelled) setSyncStatus('error');
      }
    };

    const timer = setTimeout(sync, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOffline, pendingSets.length]);
}
