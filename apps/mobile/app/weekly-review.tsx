import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
import { runWeeklyReview } from '../lib/weeklyReview';
import { SKILL_FAMILIES } from '@gravitypath/domain';

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { completedWorkouts, progressionDecisions } = useWorkoutStore();
  const { exercisePrescriptions, skillPrescriptions } = usePrescriptionStore();
  const priority = useSkillPriorityStore();
  const skillAttempts = useSkillStore((s) => s.attempts);
  const getUnlockStates = useSkillStore((s) => s.getUnlockStates);
  const [applied, setApplied] = useState(false);

  const review = useMemo(
    () =>
      runWeeklyReview(
        completedWorkouts,
        progressionDecisions,
        exercisePrescriptions,
        skillPrescriptions,
        priority,
        getUnlockStates(),
        skillAttempts.map((a) => ({
          ...a,
          completedAt: new Date(a.completedAt),
          userId: 'local',
          painLevel: a.painLevel as 0 | 1 | 2 | 3,
          selfReported: !a.videoVerified && !a.coachVerified
        })) as import('@gravitypath/domain').SkillAttempt[]
      ),
    [completedWorkouts, progressionDecisions, exercisePrescriptions, skillPrescriptions, priority, getUnlockStates, skillAttempts]
  );

  const applyDeload = () => {
    // Placeholder: in a full implementation this would write activeDeload flags
    // to each exercise prescription and skill prescription for one week.
    console.log('Applying deload:', review.deload);
    setApplied(true);
  };

  const familyName = (familyId: string) => {
    const family = SKILL_FAMILIES.find((f) => f.id === familyId);
    if (!family) return familyId;
    return isRTL && family.nameAr ? family.nameAr : family.name;
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

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Skill Progress</Text>
          {review.skillSummary.length === 0 ? (
            <Text style={[styles.cardBody, { color: c.textMuted }]}>No active skill priorities.</Text>
          ) : (
            review.skillSummary.map((summary) => (
              <View key={summary.familyId} style={styles.skillRow}>
                <Text style={[styles.cardBody, { color: c.text }]}>{familyName(summary.familyId)}</Text>
                <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                  {summary.progressPercent}% · {summary.exposuresLast7Days} exposures · avg quality {summary.averageQualityLast7Days}
                </Text>
              </View>
            ))
          )}
          <View style={[styles.rotationBadge, { backgroundColor: c.surfaceHighlight }]}>
            <Text style={{ color: c.text, fontWeight: '700' }}>
              {review.rotationRecommendation.replace(/_/g, ' ').toUpperCase()}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 13 }}>{review.rotationReason}</Text>
          </View>
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
  skillRow: { marginBottom: 12 },
  rotationBadge: { marginTop: 12, padding: 12, borderRadius: 12 },
  row: { marginBottom: 8 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
