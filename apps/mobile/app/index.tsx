import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useWorkoutStore } from '../stores/workoutStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { getProgramDay } from '@gravitypath/domain';
import { APP_NAME } from '../lib/config';

export default function Dashboard() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { user, signOut } = useAuth();
  const { activeWorkout, isOffline, pendingSets, progressionDecisions } = useWorkoutStore();
  const { getNextDayId, nextScheduledDate, trainingDays } = useScheduleStore();

  const nextDayId = activeWorkout ? activeWorkout.programDayId : getNextDayId();
  const nextDay = getProgramDay(nextDayId);
  const hasActive = activeWorkout && activeWorkout.status === 'active';
  const nextDate = new Date(nextScheduledDate);
  const isToday = new Date().toDateString() === nextDate.toDateString();

  const latestDecision = progressionDecisions[progressionDecisions.length - 1];

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
          </View>
        )}

        <View style={styles.grid}>
          <MenuButton label={t('skillTree')} onPress={() => router.push('/skill-tree')} c={c} />
          <MenuButton label={t('journey')} onPress={() => router.push('/journey')} c={c} />
          <MenuButton label={t('analytics')} onPress={() => router.push('/analytics')} c={c} />
          <MenuButton label={t('coach')} onPress={() => router.push('/coach')} c={c} />
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
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontWeight: '700', fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontSize: 14, marginBottom: 16 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuButton: { width: '47%', aspectRatio: 1.6, borderWidth: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 32, alignItems: 'center', gap: 8 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' }
});
