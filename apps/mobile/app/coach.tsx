import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useWorkoutStore } from '../stores/workoutStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { buildCoachMessages } from '../lib/coach';

const TONE_COLORS: Record<ReturnType<typeof buildCoachMessages>[number]['tone'], string> = {
  neutral: '#64748b',
  positive: '#22c55e',
  warning: '#f87171',
  action: '#38bdf8'
};

export default function CoachScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { progressionDecisions, pendingSets } = useWorkoutStore();
  const { nextScheduledDate, trainingDays } = useScheduleStore();

  const messages = buildCoachMessages({
    progressionDecisions,
    pendingSets: pendingSets.length,
    nextScheduledDate,
    trainingDays
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('coach')}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Deterministic recommendations grounded in your workout and skill data.
        </Text>

        {messages.map((m, idx) => (
          <View key={idx} style={[styles.message, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.messageTitle, { color: TONE_COLORS[m.tone] }]}>{m.title}</Text>
            <Text style={[styles.messageBody, { color: c.text, textAlign: isRTL ? 'right' : 'left' }]}>{m.body}</Text>
          </View>
        ))}

        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  message: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  messageTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  messageBody: { fontSize: 15, lineHeight: 22 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
