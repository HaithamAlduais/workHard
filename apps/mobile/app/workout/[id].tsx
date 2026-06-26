import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';
import { useWorkoutStore } from '../../stores/workoutStore';
import { formatTime } from '../../lib/time';

const DAY_PROGRAMS: Record<string, any> = {
  day1: {
    name: 'Day 1 — Push Skill, Squat, Weighted Pull',
    exercises: [
      { id: 'hs1', exerciseId: 'handstand-wall', name: 'Chest-to-wall Handstand', orderClass: 'TECHNIQUE_FIRST', targetSets: 5, targetHoldSeconds: 30 },
      { id: 'bj1', exerciseId: 'box-jump', name: 'Box Jump', orderClass: 'POWER', targetSets: 3, targetRepsMin: 3, targetRepsMax: 3 },
      { id: 'sq1', exerciseId: 'back-squat', name: 'Back Squat', orderClass: 'GYM_STRENGTH', targetSets: 3, targetRepsMin: 3, targetRepsMax: 5, targetLoadKg: 80 },
      { id: 'wpu1', exerciseId: 'weighted-pull-up', name: 'Weighted Pull-up', orderClass: 'GYM_STRENGTH', pairId: 'B', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 15 },
      { id: 'bp1', exerciseId: 'bench-press', name: 'Bench Press', orderClass: 'GYM_STRENGTH', pairId: 'B', targetSets: 3, targetRepsMin: 4, targetRepsMax: 6, targetLoadKg: 80 },
      { id: 'lc1', exerciseId: 'seated-leg-curl', name: 'Seated Leg Curl', orderClass: 'GYM_HYPERTROPHY', pairId: 'C', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12 },
      { id: 'lr1', exerciseId: 'cable-lateral-raise', name: 'Cable Lateral Raise', orderClass: 'ACCESSORY', pairId: 'C', targetSets: 2, targetRepsMin: 12, targetRepsMax: 20 }
    ]
  }
};

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();
  const { activeWorkout, startWorkout, completeSet, nextExercise, tick, finishWorkout } = useWorkoutStore();
  const [restSeconds, setRestSeconds] = useState(0);
  const [load, setLoad] = useState('');
  const [reps, setReps] = useState('');
  const [rir, setRir] = useState('');
  const [hold, setHold] = useState('');

  useEffect(() => {
    const program = DAY_PROGRAMS[id ?? 'day1'];
    if (!activeWorkout || activeWorkout.programDayId !== id) {
      startWorkout({
        id: `ws-${Date.now()}`,
        programDayId: id ?? 'day1',
        dayName: program?.name ?? 'Workout',
        startedAt: new Date().toISOString(),
        exercises: program?.exercises.map((e: any) => ({ ...e, sets: [] })) ?? [],
        currentExerciseIndex: 0,
        elapsedSeconds: 0,
        status: 'active'
      });
    }
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      tick();
      setRestSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!activeWorkout) return null;

  const currentEx = activeWorkout.exercises[activeWorkout.currentExerciseIndex];
  const completedSets = currentEx?.sets.length ?? 0;
  const isHold = !!currentEx?.targetHoldSeconds;

  const submitSet = () => {
    if (!currentEx) return;
    const set = {
      id: `set-${Date.now()}`,
      exerciseId: currentEx.exerciseId,
      setNumber: completedSets + 1,
      loadKg: Number(load) || currentEx.targetLoadKg || 0,
      reps: Number(reps) || 0,
      rir: Number(rir) || 2,
      holdSeconds: isHold ? Number(hold) || 0 : undefined,
      painLevel: 0,
      restSeconds: currentEx.pairId ? 90 : 180,
      completedAt: new Date().toISOString(),
      pendingSync: true
    };
    completeSet(currentEx.id, set);
    setRestSeconds(set.restSeconds);
    setLoad('');
    setReps('');
    setRir('');
    setHold('');
    if (completedSets + 1 >= currentEx.targetSets) {
      nextExercise();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: c.text }}>← Back</Text>
        </Pressable>
        <Text style={[styles.timer, { color: c.text }]}>{formatTime(activeWorkout.elapsedSeconds)}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.dayName, { color: c.text }]}>{activeWorkout.dayName}</Text>
        <Text style={[styles.exerciseName, { color: c.primary }]}>{currentEx?.name}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {currentEx?.orderClass} · {t('set')} {completedSets + 1} / {currentEx?.targetSets}
        </Text>

        {currentEx?.pairId && (
          <Text style={[styles.pairMeta, { color: c.warning }]}>Pair {currentEx.pairId}</Text>
        )}

        <View style={styles.inputs}>
          {!isHold && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                placeholder={t('load') + (currentEx?.targetLoadKg ? ` (${currentEx.targetLoadKg})` : '')}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={load}
                onChangeText={setLoad}
              />
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                placeholder={t('reps') + (currentEx?.targetRepsMax ? ` (${currentEx.targetRepsMin}-${currentEx.targetRepsMax})` : '')}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={reps}
                onChangeText={setReps}
              />
            </>
          )}
          {isHold && (
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
              placeholder={`Hold (${currentEx?.targetHoldSeconds}s)`}
              placeholderTextColor={c.textMuted}
              keyboardType="numeric"
              value={hold}
              onChangeText={setHold}
            />
          )}
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder={t('rir')}
            placeholderTextColor={c.textMuted}
            keyboardType="numeric"
            value={rir}
            onChangeText={setRir}
          />
        </View>

        {restSeconds > 0 && (
          <View style={[styles.restCard, { backgroundColor: c.surfaceHighlight }]}>
            <Text style={[styles.restText, { color: c.text }]}>Rest: {restSeconds}s</Text>
            <Pressable onPress={() => setRestSeconds(0)}>
              <Text style={{ color: c.primary }}>{t('skip')}</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={submitSet}>
          <Text style={styles.buttonText}>✓ {t('set')} {completedSets + 1}</Text>
        </Pressable>

        <Pressable style={[styles.finishButton, { borderColor: c.border }]} onPress={finishWorkout}>
          <Text style={{ color: c.text }}>Finish Workout</Text>
        </Pressable>

        <View style={styles.progress}>
          {activeWorkout.exercises.map((ex, idx) => (
            <View
              key={ex.id}
              style={[
                styles.dot,
                { backgroundColor: idx === activeWorkout.currentExerciseIndex ? c.primary : ex.sets.length >= ex.targetSets ? c.success : c.border }
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#334155' },
  timer: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  scroll: { padding: 20, paddingBottom: 60 },
  dayName: { fontSize: 14, marginBottom: 8, opacity: 0.8 },
  exerciseName: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  meta: { fontSize: 16, marginBottom: 12 },
  pairMeta: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  inputs: { gap: 12, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  restCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  restText: { fontSize: 20, fontWeight: '700' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  finishButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, marginBottom: 24 },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 }
});
