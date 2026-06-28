import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePrescriptionStore, type ReplacementRecord } from '../stores/prescriptionStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useEquipmentStore } from '../stores/equipmentStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { runWeeklyReview } from '../lib/weeklyReview';
import { useHomeReadiness, aggregateWeeklyVolume, getPainFlaggedExerciseIds } from '../lib/readiness';
import {
  getHybridProgramDay,
  updateSkillPrescriptionStatuses,
  evaluateReplacementsForDay,
  SKILL_FAMILIES
} from '@gravitypath/domain';

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { completedWorkouts, progressionDecisions } = useWorkoutStore();
  const {
    exercisePrescriptions,
    skillPrescriptions,
    approveReplacement,
    rejectReplacement,
    deferReplacement,
    activeReplacements,
    isOnCooldown
  } = usePrescriptionStore();
  const priority = useSkillPriorityStore();
  const skillAttempts = useSkillStore((s) => s.attempts);
  const getUnlockStates = useSkillStore((s) => s.getUnlockStates);
  const { getNextDayId } = useScheduleStore();
  const equipment = useEquipmentStore();
  const calibration = useCalibrationStore();
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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

  const { readiness, topBlockers } = useHomeReadiness();

  const nextDayId = getNextDayId();
  const replacementCandidates = useMemo(() => {
    const unlockStates = getUnlockStates();
    const skillPrescriptionsWithStatus = { ...skillPrescriptions };
    const statuses = updateSkillPrescriptionStatuses(priority, skillPrescriptionsWithStatus, unlockStates);
    for (const [nodeId, status] of Object.entries(statuses)) {
      const existing = skillPrescriptionsWithStatus[nodeId];
      if (existing) skillPrescriptionsWithStatus[nodeId] = { ...existing, status };
    }
    const { day } = getHybridProgramDay(nextDayId, {
      priority,
      skillPrescriptions: skillPrescriptionsWithStatus,
      unlockStates,
      startingNodes: calibration.skillStartingNodesByFamily,
      availableMinutes: 60
    });
    const weeklyVolumeByMuscle: Record<string, { muscleId: string; directSets: number }> = {};
    for (const [muscleId, entry] of Object.entries(aggregateWeeklyVolume(completedWorkouts, useWorkoutStore.getState().sets))) {
      weeklyVolumeByMuscle[muscleId] = { muscleId, directSets: entry.directSets };
    }
    const painFlagged = getPainFlaggedExerciseIds(completedWorkouts, useWorkoutStore.getState().sets);
    const result = evaluateReplacementsForDay(day, {
      userId: 'local',
      equipmentOwned: equipment.getOwnedList(),
      unlockStates,
      skillAttempts: skillAttempts.map((a) => ({
        ...a,
        completedAt: new Date(a.completedAt),
        userId: 'local',
        painLevel: a.painLevel as 0 | 1 | 2 | 3,
        selfReported: !a.videoVerified && !a.coachVerified
      })),
      weeklyVolumeByMuscle,
      sessionTimeMinutes: day.targetDurationMinutes,
      painFree: painFlagged.length === 0
    });
    return result;
  }, [nextDayId, priority, skillPrescriptions, getUnlockStates, calibration.skillStartingNodesByFamily, completedWorkouts, equipment, skillAttempts]);

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

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Replacement Candidates</Text>
          {(() => {
            const visible = Array.from(replacementCandidates.decisions.entries()).filter(
              ([exerciseId]) => !isOnCooldown(exerciseId) && !dismissed.has(exerciseId)
            );
            if (visible.length === 0) {
              return <Text style={[styles.cardBody, { color: c.textMuted }]}>No replacement candidates this week.</Text>;
            }
            return visible.map(([exerciseId, result]) => {
              const active = activeReplacements[exerciseId];
              const approved = active?.status === 'active' && active.percentage === result.decision.percentage;
              return (
                <View key={exerciseId} style={styles.candidateRow}>
                  <Text style={[styles.cardBody, { color: c.text }]}>
                    {exerciseId.replace(/-/g, ' ')}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>
                    Replace {result.decision.percentage}% with {result.calisthenicsNode.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                    {result.decision.reason}
                  </Text>
                  {approved ? (
                    <View style={styles.buttonRow}>
                      <Text style={{ color: c.success, fontSize: 13, marginTop: 4 }}>Approved</Text>
                      <Pressable
                        testID={`reverse-replacement-${exerciseId}`}
                        style={[styles.smallButton, { backgroundColor: c.warning }]}
                        onPress={() => rejectReplacement(exerciseId)}
                      >
                        <Text style={styles.smallButtonText}>Reverse</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.buttonRow}>
                      <Pressable
                        testID={`approve-replacement-${exerciseId}`}
                        style={[styles.smallButton, { backgroundColor: c.success }]}
                        onPress={() => {
                          const record: ReplacementRecord = {
                            id: `rep-${Date.now()}-${exerciseId}`,
                            exerciseId,
                            calisthenicsNodeId: result.calisthenicsNode.id,
                            percentage: result.decision.percentage,
                            reason: result.decision.reason,
                            approvedAt: new Date().toISOString(),
                            status: 'active'
                          };
                          approveReplacement(record);
                        }}
                      >
                        <Text style={styles.smallButtonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        testID={`reject-replacement-${exerciseId}`}
                        style={[styles.smallButton, { backgroundColor: c.danger }]}
                        onPress={() => {
                          rejectReplacement(exerciseId);
                          setDismissed((prev) => new Set(prev).add(exerciseId));
                        }}
                      >
                        <Text style={styles.smallButtonText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        testID={`defer-replacement-${exerciseId}`}
                        style={[styles.smallButton, { backgroundColor: c.border }]}
                        onPress={() => {
                          deferReplacement(exerciseId);
                          setDismissed((prev) => new Set(prev).add(exerciseId));
                        }}
                      >
                        <Text style={[styles.smallButtonText, { color: c.text }]}>Defer</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            });
          })()}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Home Readiness Changes</Text>
          {topBlockers.length === 0 ? (
            <Text style={[styles.cardBody, { color: c.success }]}>All movement patterns are home-ready.</Text>
          ) : (
            topBlockers.map((blocker, idx) => (
              <Text key={idx} style={[styles.cardBody, { color: c.warning, fontSize: 14, marginBottom: 4 }]}>
                ⚠ {blocker}
              </Text>
            ))
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
  skillRow: { marginBottom: 12 },
  rotationBadge: { marginTop: 12, padding: 12, borderRadius: 12 },
  row: { marginBottom: 8 },
  candidateRow: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  smallButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  smallButtonText: { color: '#000', fontSize: 13, fontWeight: '700' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' }
});
