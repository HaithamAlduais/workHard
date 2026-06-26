import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

const MILESTONES = [
  { id: 'foundation', label: 'Foundation', done: true },
  { id: 'hybrid', label: 'Hybrid Strength', done: true },
  { id: 'bridge', label: 'Skill Bridge', done: false, current: true },
  { id: 'weighted', label: 'Weighted Calisthenics', done: false },
  { id: 'dominant', label: 'Calisthenics Dominant', done: false },
  { id: 'home', label: 'Home Ready', done: false },
  { id: 'graduation', label: 'Gym Graduation', done: false },
  { id: 'mastery', label: 'Expert Mastery', done: false }
];

const PATTERNS = [
  { id: 'VERTICAL_PUSH', label: 'Vertical Push', ready: false },
  { id: 'VERTICAL_PULL', label: 'Vertical Pull', ready: true },
  { id: 'HORIZONTAL_PUSH', label: 'Horizontal Push', ready: false },
  { id: 'HORIZONTAL_PULL', label: 'Horizontal Pull', ready: true },
  { id: 'KNEE_DOMINANT', label: 'Knee Dominant', ready: false },
  { id: 'KNEE_FLEXION', label: 'Knee Flexion', ready: false },
  { id: 'HIP_HINGE', label: 'Hip Hinge', ready: false },
  { id: 'GRIP', label: 'Grip', ready: true }
];

export default function JourneyScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();

  const readyCount = PATTERNS.filter((p) => p.ready).length;
  const progress = Math.round((readyCount / PATTERNS.length) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('journey')}</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.progressText, { color: c.text }]}>Home Readiness: {progress}%</Text>
          <View style={[styles.bar, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: c.primary, width: `${progress}%` }]} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>Milestones</Text>
        {MILESTONES.map((m) => (
          <View key={m.id} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 }]}>
            <Text style={{ color: m.done ? c.success : m.current ? c.primary : c.textMuted, fontSize: 18, marginRight: 10 }}>
              {m.done ? '✓' : m.current ? '▶' : '○'}
            </Text>
            <Text style={[styles.rowText, { color: c.text }]}>{m.label}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: c.text }]}>Movement Patterns</Text>
        {PATTERNS.map((p) => (
          <View key={p.id} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 }]}>
            <Text style={{ color: p.ready ? c.success : c.warning, marginRight: 10 }}>{p.ready ? '✓' : '○'}</Text>
            <Text style={[styles.rowText, { color: c.text }]}>{p.label}</Text>
            <Text style={{ color: p.ready ? c.success : c.textMuted, marginLeft: 'auto' }}>{p.ready ? t('homeReady') : t('gymDependent')}</Text>
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
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  progressText: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 16, fontWeight: '600' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
