import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useWorkoutStore } from '../stores/workoutStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useSkillStore } from '../stores/skillStore';
import {
  getHybridProgramDay,
  updateSkillPrescriptionStatuses,
  SKILL_FAMILIES,
  checkSkillPriorityConflicts,
  type SkillPriority
} from '@gravitypath/domain';
import { buildCoachMessage } from '../lib/coach';
import { APP_NAME } from '../lib/config';

function familyName(familyId: string, isRTL: boolean): string {
  const family = SKILL_FAMILIES.find((f) => f.id === familyId);
  if (!family) return familyId;
  return isRTL && family.nameAr ? family.nameAr : family.name;
}

function blockWeekText(priority: SkillPriority): string {
  if (!priority.blockStart || !priority.blockEnd) return 'No active block';
  const start = new Date(priority.blockStart);
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const week = Math.floor(days / 7) + 1;
  return `Week ${week} of ${priority.blockLengthWeeks}`;
}

export default function Dashboard() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { user, signOut } = useAuth();
  const { activeWorkout, isOffline, pendingSets, progressionDecisions } = useWorkoutStore();
  const { getNextDayId, nextScheduledDate, trainingDays } = useScheduleStore();
  const calibration = useCalibrationStore();
  const {
    initialized,
    exercisePrescriptions,
    skillPrescriptions,
    pendingExercisePrescriptions,
    pendingSkillPrescriptions,
    initializePrescriptions,
    recomputeSkillStatuses
  } = usePrescriptionStore();
  const priority = useSkillPriorityStore();
  const skillAttempts = useSkillStore((s) => s.attempts);
  const getUnlockStates = useSkillStore((s) => s.getUnlockStates);

  useEffect(() => {
    if (!initialized) {
      initializePrescriptions('local', calibration);
    }
  }, [initialized, initializePrescriptions, calibration]);

  useEffect(() => {
    if (initialized) {
      recomputeSkillStatuses();
    }
  }, [initialized, recomputeSkillStatuses, priority.primarySkillFamilyId, priority.secondarySkillFamilyIds.join(','), skillAttempts.length]);

  const nextDayId = activeWorkout ? activeWorkout.programDayId : getNextDayId();
  const hasActive = activeWorkout && activeWorkout.status === 'active';
  const nextDate = new Date(nextScheduledDate);
  const isToday = new Date().toDateString() === nextDate.toDateString();

  const latestDecision = progressionDecisions[progressionDecisions.length - 1];

  const pendingPrescriptionCount =
    Object.keys(pendingExercisePrescriptions).length +
    Object.keys(pendingSkillPrescriptions).length;

  const hasActiveDeload = Object.values(exercisePrescriptions).some((p) => p.activeDeload);
  const hasSafetyHold = Object.values(skillPrescriptions).some((p) => p.activeSafetyHold);

  const warnings = useMemo(
    () => checkSkillPriorityConflicts(priority, skillPrescriptions),
    [priority, skillPrescriptions]
  );

  const nextDayInfo = useMemo(() => {
    if (!initialized) return null;
    const unlockStates = getUnlockStates();
    const skillPrescriptionsWithStatus = { ...skillPrescriptions };
    const statuses = updateSkillPrescriptionStatuses(priority, skillPrescriptionsWithStatus, unlockStates);
    for (const [nodeId, status] of Object.entries(statuses)) {
      const existing = skillPrescriptionsWithStatus[nodeId];
      if (existing) {
        skillPrescriptionsWithStatus[nodeId] = { ...existing, status };
      }
    }
    return getHybridProgramDay(nextDayId, {
      priority,
      skillPrescriptions: skillPrescriptionsWithStatus,
      unlockStates,
      startingNodes: calibration.skillStartingNodes,
      availableMinutes: 60
    });
  }, [nextDayId, priority, skillPrescriptions, initialized, getUnlockStates]);

  const nextDay = nextDayInfo?.day;

  const primaryExercises = nextDay?.exercises.filter(
    (ex) => ex.orderClass === 'GYM_STRENGTH' || ex.orderClass === 'STRENGTH_SKILL' || ex.role === 'skill'
  ) ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>{APP_NAME}</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>{t('tagline')}</Text>
          <View style={styles.badges}>
            {isOffline && (
              <View style={[styles.badge, { backgroundColor: c.warning }]}>
                <Text style={styles.badgeText}>{t('offline')}</Text>
              </View>
            )}
            {pendingSets.length > 0 && !isOffline && (
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <Text style={styles.badgeText}>{t('syncPending')} ({pendingSets.length})</Text>
              </View>
            )}
            {pendingPrescriptionCount > 0 && (
              <View style={[styles.badge, { backgroundColor: c.warning }]}>
                <Text style={styles.badgeText}>Prescriptions Pending ({pendingPrescriptionCount})</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('nextWorkout')}</Text>
          <Text style={[styles.cardBody, { color: c.text }]}>
            {isRTL && nextDay?.nameAr ? nextDay.nameAr : nextDay?.name ?? 'Workout'}
          </Text>
          <Text style={[styles.cardMeta, { color: c.textMuted }]}>
            {isToday ? t('today') : nextDate.toLocaleDateString()} · ~{nextDay?.targetDurationMinutes ?? 58} {t('minutes')}
          </Text>

          {warnings.length > 0 && (
            <View style={styles.warningBox}>
              {warnings.map((warning, idx) => (
                <Text key={idx} style={[styles.warningText, { color: c.warning }]}>
                  ⚠ {warning.message}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.priorityRowCompact}>
            <View style={[styles.priorityBadge, { backgroundColor: c.primary }]}>
              <Text style={styles.priorityBadgeText}>
                Primary: {familyName(priority.primarySkillFamilyId, isRTL)}
              </Text>
            </View>
            {priority.secondarySkillFamilyIds.map((familyId) => (
              <View key={familyId} style={[styles.priorityBadge, { backgroundColor: c.surfaceHighlight }]}>
                <Text style={[styles.priorityBadgeText, { color: c.text }]}>
                  {familyName(familyId, isRTL)}
                </Text>
              </View>
            ))}
            <Text style={[styles.blockText, { color: c.textMuted }]}>{blockWeekText(priority)}</Text>
          </View>

          {primaryExercises.length > 0 && (
            <View style={styles.prescriptionList}>
              {primaryExercises.map((ex) => {
                const key = `${nextDayId}|${ex.exerciseId}`;
                const prescription = skillPrescriptions[ex.exerciseId] ?? exercisePrescriptions[key];
                const message = prescription ? buildCoachMessage(prescription as any) : ex.name;
                return (
                  <Text key={ex.exerciseId} style={[styles.prescriptionItem, { color: c.textMuted }]}>
                    • {message}
                  </Text>
                );
              })}
            </View>
          )}

          <Pressable
            style={[styles.button, { backgroundColor: c.primary }]}
            onPress={() => router.push(`/workout/${nextDayId}`)}
          >
            <Text style={styles.buttonText}>{hasActive ? (t('continueWorkout') ?? 'Continue') : t('startWorkout')}</Text>
          </Pressable>
        </View>

        {latestDecision && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t('coach')}</Text>
            <Text style={[styles.cardBody, { color: c.textMuted }]}>{latestDecision.reason}</Text>
            {(hasActiveDeload || hasSafetyHold) && (
              <Text style={[styles.warningText, { color: c.danger }]}>
                ⚠ {hasActiveDeload ? 'Active deload in effect.' : ''}{' '}
                {hasSafetyHold ? 'Safety hold active on a skill.' : ''}
              </Text>
            )}
          </View>
        )}

        <View style={styles.grid}>
          <MenuButton label={t('skillTree')} onPress={() => router.push('/skill-tree')} c={c} />
          <MenuButton label={t('journey')} onPress={() => router.push('/journey')} c={c} />
          <MenuButton label={t('analytics')} onPress={() => router.push('/analytics')} c={c} />
          <MenuButton label={t('coach')} onPress={() => router.push('/coach')} c={c} />
          <MenuButton label={t('weeklyReview')} onPress={() => router.push('/weekly-review')} c={c} />
          <MenuButton label={t('settings')} onPress={() => router.push('/settings')} c={c} />
          <MenuButton label={t('onboarding')} onPress={() => router.push('/onboarding')} c={c} />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted }]}>
            {user ? user.email : t('logIn')}
          </Text>
          {user && (
            <Pressable onPress={signOut}>
              <Text style={[styles.link, { color: c.danger }]}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuButton({ label, onPress, c }: { label: string; onPress: () => void; c: any }) {
  return (
    <Pressable style={[styles.menuButton, { backgroundColor: c.surface, borderColor: c.border }]} onPress={onPress}>
      <Text style={[styles.menuText, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontWeight: '700', fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontSize: 14, marginBottom: 16 },
  warningBox: { marginBottom: 12 },
  warningText: { fontSize: 14, marginTop: 8, fontWeight: '600' },
  priorityRowCompact: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  priorityBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  blockText: { fontSize: 12, fontWeight: '600' },
  prescriptionList: { marginBottom: 16 },
  prescriptionItem: { fontSize: 14, marginBottom: 4 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuButton: { width: '47%', aspectRatio: 1.6, borderWidth: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 32, alignItems: 'center', gap: 8 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' }
});
