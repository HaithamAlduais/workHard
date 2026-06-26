import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

const SKILL_FAMILIES = [
  { id: 'pull-up', name: 'Pull-up', nodes: ['Active Hang', 'Scapular Pull-up', 'Assisted Pull-up', 'Strict Pull-up', 'Weighted Pull-up'] },
  { id: 'handstand', name: 'Handstand', nodes: ['Wall Plank', 'Chest-to-wall HS', 'Wall HSPU', 'Freestanding HSPU'] },
  { id: 'front-lever', name: 'Front Lever', nodes: ['Active Hang', 'Tuck FL', 'Advanced Tuck', 'Full Front Lever'] },
  { id: 'planche', name: 'Planche', nodes: ['Planche Lean', 'Tuck Planche', 'Straddle Planche', 'Full Planche'] },
  { id: 'pistol', name: 'Pistol', nodes: ['Box Pistol', 'Full Pistol', 'Weighted Pistol'] }
];

export default function SkillTreeScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('skillTree')}</Text>
        {SKILL_FAMILIES.map((family) => (
          <View key={family.id} style={[styles.familyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.familyName, { color: c.text }]}>{family.name}</Text>
            <View style={styles.nodes}>
              {family.nodes.map((node, idx) => {
                const status = idx < 2 ? 'unlocked' : 'locked';
                return (
                  <View key={node} style={styles.nodeRow}>
                    <View style={[styles.badge, { backgroundColor: status === 'unlocked' ? c.success : c.border }]} />
                    <Text style={[styles.nodeName, { color: c.text }]}>{node}</Text>
                    <Text style={[styles.status, { color: c.textMuted }]}>{t(status)}</Text>
                  </View>
                );
              })}
            </View>
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
  familyCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  familyName: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  nodes: { gap: 10 },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 12, height: 12, borderRadius: 6 },
  nodeName: { flex: 1, fontSize: 16 },
  status: { fontSize: 14 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
