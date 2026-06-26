import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useScheduleStore } from '../../stores/scheduleStore';
import { formatTime } from '../../lib/time';
import { generateProgressionDecisions } from '../../lib/progression';
import { recordSkillAttemptsFromWorkout } from '../../lib/skills';
import { currentExercise, currentBlock, getProgramDay } from '@gravitypath/domain';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { activeWorkout, sets, startWorkout, completeSet, skipSet, stopForPain, tick, finishWorkout, addProgressionDecision } = useWorkoutStore();
  const { markDayCompleted } = useScheduleStore();
  const [restSeconds, setRestSeconds] = useState(0);
  const [load, setLoad] = useState('');
  const [reps, setReps] = useState('');
  const [rir, setRir] = useState('');
  const [hold, setHold] = useState('');
  const [rom, setRom] = useState<'full' | 'partial' | 'assisted'>('full');
  const [form, setForm] = useState<'good' | 'acceptable' | 'poor'>('good');
  const [pain, setPain] = useState<0 | 1 | 2 | 3>(0);
  const [powerQuality, setPowerQuality] = useState<'fast' | 'acceptable' | 'slower'>('acceptable');

  useEffect(() => {
    if (!activeWorkout || activeWorkout.programDayId !== id) {
      startWorkout(id ?? 'day1');
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

  const block = currentBlock(activeWorkout);
  const ex = currentExercise(activeWorkout);
  if (!ex || !block) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: c.text }]}>Workout Complete</Text>
          <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>{t('back') ?? 'Back to Dashboard'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const completedSets = useWorkoutStore.getState().sets.filter((s) => s.exerciseId === ex.id && s.status !== 'skipped').length;
  const isHold = !!ex.targetHoldSeconds;
  const isPower = ex.orderClass === 'POWER';

  const submitSet = () => {
    const loadNum = load === '' ? (ex.targetLoadKg ?? 0) : Number(load);
    const repsNum = reps === '' ? 0 : Number(reps);
    const rirNum = rir === '' ? 2 : Number(rir);
    const holdNum = hold === '' ? 0 : Number(hold);
    const set = {
      id: `set-${Date.now()}`,
      blockId: block.id,
      exerciseId: ex.id,
      workoutSessionId: activeWorkout.id,
      setNumber: completedSets + 1,
      loadKg: loadNum,
      reps: repsNum,
      rir: rirNum,
      holdSeconds: holdNum,
      rom,
      form,
      painLevel: pain,
      powerQuality: isPower ? powerQuality : undefined,
      restSeconds: ex.restSeconds,
      completedAt: new Date().toISOString(),
      pendingSync: true,
      status: 'completed' as const
    };
    const result = completeSet(set);
    setRestSeconds(result.restSeconds);
    setLoad('');
    setReps('');
    setRir('');
    setHold('');
    setRom('full');
    setForm('good');
    setPain(0);
    setPowerQuality('acceptable');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: c.text }}>← {t('back') ?? 'Back'}</Text>
        </Pressable>
        <Text style={[styles.timer, { color: c.text }]}>{formatTime(activeWorkout.elapsedSeconds)}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.dayName, { color: c.text }]}>{activeWorkout.dayName}</Text>
        <Text style={[styles.exerciseName, { color: c.primary }]}>{isRTL && ex.nameAr ? ex.nameAr : ex.name}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {block.type} · {ex.orderClass} · {t('set')} {completedSets + 1} / {ex.targetSets}
        </Text>

        {block.exercises.length > 1 && (
          <Text style={[styles.pairMeta, { color: c.warning }]}>
            {t('pair') ?? 'Pair'} {block.id} ({block.exercises.map((e) => (isRTL && e.nameAr ? e.nameAr : e.name)).join(' / ')})
          </Text>
        )}

        <View style={styles.inputs}>
          {!isHold && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={`${t('load')} ${ex.targetLoadKg ? `(${ex.targetLoadKg})` : ''}`}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={load}
                onChangeText={setLoad}
              />
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={`${t('reps')} ${ex.targetRepsMax ? `(${ex.targetRepsMin}-${ex.targetRepsMax})` : ''}`}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={reps}
                onChangeText={setReps}
              />
            </>
          )}
          {isHold && (
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={`${t('hold')} ${ex.targetHoldSeconds ? `(${ex.targetHoldSeconds}s)` : ''}`}
              placeholderTextColor={c.textMuted}
              keyboardType="numeric"
              value={hold}
              onChangeText={setHold}
            />
          )}
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('rir')}
            placeholderTextColor={c.textMuted}
            keyboardType="numeric"
            value={rir}
            onChangeText={setRir}
          />

          {isPower && (
            <View style={styles.row}>
              {(['fast', 'acceptable', 'slower'] as const).map((q) => (
                <Pressable
                  key={q}
                  style={[styles.chip, powerQuality === q && { backgroundColor: c.primary }]}
                  onPress={() => setPowerQuality(q)}
                >
                  <Text style={{ color: powerQuality === q ? '#fff' : c.text }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.row}>
            {(['full', 'partial', 'assisted'] as const).map((r) => (
              <Pressable key={r} style={[styles.chip, rom === r && { backgroundColor: c.primary }]} onPress={() => setRom(r)}>
                <Text style={{ color: rom === r ? '#fff' : c.text }}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            {(['good', 'acceptable', 'poor'] as const).map((f) => (
              <Pressable key={f} style={[styles.chip, form === f && { backgroundColor: c.primary }]} onPress={() => setForm(f)}>
                <Text style={{ color: form === f ? '#fff' : c.text }}>{f}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            {([0, 1, 2, 3] as const).map((p) => (
              <Pressable
                key={p}
                style={[styles.chip, pain === p && { backgroundColor: p >= 2 ? c.danger : c.primary }]}
                onPress={() => setPain(p)}
              >
                <Text style={{ color: pain === p ? '#fff' : c.text }}>{t('pain')} {p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {restSeconds > 0 && (
          <View style={[styles.restCard, { backgroundColor: c.surfaceHighlight }]}>
            <Text style={[styles.restText, { color: c.text }]}>
              {t('restTimer')}: {formatTime(restSeconds)}
            </Text>
            <View style={styles.restControls}>
              <Pressable onPress={() => setRestSeconds((s) => s + 15)}>
                <Text style={{ color: c.primary, marginRight: 12 }}>+15</Text>
              </Pressable>
              <Pressable onPress={() => setRestSeconds((s) => Math.max(0, s - 15))}>
                <Text style={{ color: c.primary, marginRight: 12 }}>-15</Text>
              </Pressable>
              <Pressable onPress={() => setRestSeconds(0)}>
                <Text style={{ color: c.primary }}>{t('skip')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={submitSet}>
          <Text style={styles.buttonText}>✓ {t('set')} {completedSets + 1}</Text>
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable style={[styles.secondaryButton, { borderColor: c.border }]} onPress={skipSet}>
            <Text style={{ color: c.text }}>{t('skip')}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { borderColor: c.danger }]} onPress={stopForPain}>
            <Text style={{ color: c.danger }}>{t('holdForSafety')}</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.finishButton, { borderColor: c.border }]}
          onPress={() => {
            if (activeWorkout) {
              const completedSets = sets.filter((s) => s.workoutSessionId === activeWorkout.id && s.status === 'completed');
              const decisions = generateProgressionDecisions(activeWorkout, sets);
              decisions.forEach(addProgressionDecision);
              recordSkillAttemptsFromWorkout(completedSets, activeWorkout.id);
            }
            finishWorkout();
            markDayCompleted(id ?? 'day1');
            router.replace('/');
          }}
        >
          <Text style={{ color: c.text }}>Finish Workout</Text>
        </Pressable>

        <View style={styles.progress}>
          {activeWorkout.blocks.map((b, idx) => (
            <View
              key={b.id}
              style={[
                styles.dot,
                { backgroundColor: idx === activeWorkout.currentBlockIndex ? c.primary : b.completed ? c.success : c.border }
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#334155' },
  timer: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  scroll: { padding: 20, paddingBottom: 60 },
  dayName: { fontSize: 14, marginBottom: 8, opacity: 0.8 },
  exerciseName: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  meta: { fontSize: 16, marginBottom: 12 },
  pairMeta: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  inputs: { gap: 12, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#64748b' },
  restCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  restText: { fontSize: 20, fontWeight: '700' },
  restControls: { flexDirection: 'row' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  secondaryButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  finishButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, marginBottom: 24 },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 }
});
