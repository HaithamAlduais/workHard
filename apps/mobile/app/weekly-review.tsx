import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { runWeeklyReview } from '../lib/weeklyReview';

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();
  const { completedWorkouts, progressionDecisions } = useWorkoutStore();
  const { exercisePrescriptions, skillPrescriptions } = usePrescriptionStore();
  const [applied, setApplied] = useState(false);

  const review = useMemo(
    () =>
      runWeeklyReview(
        completedWorkouts,
        progressionDecisions,
        exercisePrescriptions,
        skillPrescriptions
      ),
    [completedWorkouts, progressionDecisions, exercisePrescriptions, skillPrescriptions]
  );

  const applyDeload = () => {
    // Placeholder: in a full implementation this would write activeDeload flags
    // to each exercise prescription and skill prescription for one week.
    console.log('Applying deload:', review.deload);
    setApplied(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('weeklyReview')}</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('deload')}</Text>
          <Text style={[styles.cardBody, { color: c.text }]}>
            {review.deload.deload ? 'Yes — deload recommended' : 'No deload needed'}
          </Text>
          <Text style={[styles.cardMeta, { color: c.textMuted }]}>{review.deload.reason}</Text>
          {review.deload.deload && (
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>
              {review.deload.loadReductionPercent}% load reduction ·{' '}
              {review.deload.setReductionPercent}% set reduction ·{' '}
              {review.deload.durationDays} days
            </Text>
          )}
          {review.deload.deload && !applied && (
            <Pressable
              style={[styles.button, { backgroundColor: c.warning }]}
              onPress={applyDeload}
            >
              <Text style={styles.buttonText}>Apply Deload for One Week</Text>
            </Pressable>
          )}
          {applied && (
            <Text style={[styles.cardMeta, { color: c.success }]}>Deload applied (placeholder).</Text>
          )}
        </View>

        {review.regressingExercises.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Regressing</Text>
            {review.regressingExercises.map((id) => (
              <Text key={id} style={[styles.cardBody, { color: c.danger }]}>
                • {id}
              </Text>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Set Addition Candidates</Text>
          {review.setAdditions.length === 0 ? (
            <Text style={[styles.cardBody, { color: c.textMuted }]}>None this week.</Text>
          ) : (
            review.setAdditions.map((candidate) => (
              <View key={candidate.exerciseId} style={styles.row}>
                <Text style={[styles.cardBody, { color: c.text }]}>• {candidate.name}</Text>
                <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                  {candidate.decision.reason}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Adherence</Text>
          <Text style={[styles.cardBody, { color: c.text }]}>{review.adherencePercent}%</Text>
          <Text style={[styles.cardMeta, { color: c.textMuted }]}>{review.summary}</Text>
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: c.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>{t('back')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontSize: 14, marginTop: 2 },
  row: { marginBottom: 8 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
