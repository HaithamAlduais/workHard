import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useHomeReadiness } from '../lib/readiness';
import { useGraduationStore } from '../stores/graduationStore';
import { useSkillStore } from '../stores/skillStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { MOVEMENT_PATTERNS } from '@gravitypath/domain';

interface Milestone {
  id: string;
  label: string;
  labelAr: string;
}

const MILESTONES: Milestone[] = [
  { id: 'foundation', label: 'Foundation', labelAr: 'الأساس' },
  { id: 'hybrid', label: 'Hybrid Strength', labelAr: 'القوة الهجينة' },
  { id: 'skillBridge', label: 'Skill Bridge', labelAr: 'جسر المهارات' },
  { id: 'weighted', label: 'Weighted Calisthenics', labelAr: 'التمارين الرياضية بالوزن' },
  { id: 'dominant', label: 'Calisthenics Dominant', labelAr: 'سيطرة التمارين الرياضية' },
  { id: 'home', label: 'Home Ready', labelAr: 'جاهز للمنزل' },
  { id: 'graduation', label: 'Gym Graduation', labelAr: 'تخرج الصالة' },
  { id: 'mastery', label: 'Expert Mastery', labelAr: 'الإتقان الخبير' }
];

const PATTERN_LABELS: Record<string, { en: string; ar: string }> = {
  VERTICAL_PUSH: { en: 'Vertical Push', ar: 'دفع عمودي' },
  VERTICAL_PULL: { en: 'Vertical Pull', ar: 'سحب عمودي' },
  HORIZONTAL_PUSH: { en: 'Horizontal Push', ar: 'دفع أفقي' },
  HORIZONTAL_PULL: { en: 'Horizontal Pull', ar: 'سحب أفقي' },
  KNEE_DOMINANT: { en: 'Knee Dominant', ar: 'سيطرة الركبة' },
  HIP_HINGE: { en: 'Hip Hinge', ar: 'مفصل الورك' },
  KNEE_FLEXION: { en: 'Knee Flexion', ar: 'ثني الركبة' },
  CALF: { en: 'Calf', ar: 'السمانة' },
  CORE_COMPRESSION: { en: 'Core Compression', ar: 'ضغط القلب' },
  GRIP: { en: 'Grip', ar: 'القبضة' },
  UPPER_BODY_POWER: { en: 'Upper Body Power', ar: 'قوة الجزء العلوي' },
  LOWER_BODY_POWER: { en: 'Lower Body Power', ar: 'قوة الجزء السفلي' }
};

function isPatternReady(readiness: Map<string, { equipmentReady: boolean; performanceReady: boolean; volumeReady: boolean; timeReady: boolean; painFree: boolean }>, pattern: string): boolean {
  const r = readiness.get(pattern);
  if (!r) return false;
  return r.equipmentReady && r.performanceReady && r.volumeReady && r.timeReady && r.painFree;
}

export default function JourneyScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const { readiness, percent } = useHomeReadiness();
  const { completedWorkouts } = useWorkoutStore();
  const { getUnlockStates } = useSkillStore();
  const { homeIndependenceMode, completedTemplates } = useGraduationStore();

  const unlockStates = getUnlockStates();
  const unlockedNodes = Array.from(unlockStates.values()).filter(
    (s) => s.status === 'unlocked' || s.status === 'mastered'
  ).length;

  const milestoneDone: Record<string, boolean> = {
    foundation: completedWorkouts.length >= 1,
    hybrid: completedWorkouts.length >= 5,
    skillBridge: unlockedNodes >= 3,
    weighted: percent >= 50,
    dominant: percent >= 80,
    home: homeIndependenceMode || percent >= 95,
    graduation: completedTemplates.includes('ADVANCED_CALISTHENICS_GRADUATION'),
    mastery: completedTemplates.includes('ELITE_MASTERY')
  };

  const currentMilestoneId = MILESTONES.find((m) => !milestoneDone[m.id])?.id ?? MILESTONES[MILESTONES.length - 1].id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('journey')}</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.progressText, { color: c.text }]}>{t('homeReadiness') ?? 'Home Readiness'}: {percent}%</Text>
          <View style={[styles.bar, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: c.primary, width: `${percent}%` }]} />
          </View>
          {percent < 100 && (
            <Text style={[styles.blockerHint, { color: c.textMuted }]}>
              {t('topBlockers') ?? 'Top blockers'}: {MOVEMENT_PATTERNS.filter((p) => !isPatternReady(readiness, p)).slice(0, 3).join(', ')}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>{t('milestones') ?? 'Milestones'}</Text>
        {MILESTONES.map((m) => {
          const done = milestoneDone[m.id];
          const current = currentMilestoneId === m.id;
          return (
            <View key={m.id} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 }]}>
              <Text style={{ color: done ? c.success : current ? c.primary : c.textMuted, fontSize: 18, marginRight: 10 }}>
                {done ? '✓' : current ? '▶' : '○'}
              </Text>
              <Text style={[styles.rowText, { color: c.text }]}>{isRTL ? m.labelAr : m.label}</Text>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { color: c.text }]}>{t('movementPatterns') ?? 'Movement Patterns'}</Text>
        {MOVEMENT_PATTERNS.map((pattern) => {
          const ready = isPatternReady(readiness, pattern);
          const labels = PATTERN_LABELS[pattern] ?? { en: pattern, ar: pattern };
          return (
            <View key={pattern} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 }]}>
              <Text style={{ color: ready ? c.success : c.warning, marginRight: 10 }}>{ready ? '✓' : '○'}</Text>
              <Text style={[styles.rowText, { color: c.text }]}>{isRTL ? labels.ar : labels.en}</Text>
              <Text style={{ color: ready ? c.success : c.textMuted, marginLeft: 'auto' }}>{ready ? t('homeReady') : t('gymDependent')}</Text>
            </View>
          );
        })}

        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonText}>{t('back') ?? 'Back'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  progressText: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%' },
  blockerHint: { fontSize: 13, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 16, fontWeight: '600' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
