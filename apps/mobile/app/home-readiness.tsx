import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useHomeReadiness } from '../lib/readiness';
import { useEquipmentStore, EQUIPMENT_IDS } from '../stores/equipmentStore';

function equipmentLabel(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function HomeReadinessScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();
  const { readiness, percent, topBlockers } = useHomeReadiness();
  const equipment = useEquipmentStore();

  const patterns = useMemo(() => Array.from(readiness.values()), [readiness]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text testID="home-readiness-title" style={[styles.title, { color: c.text }]}>Home Readiness</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Overall</Text>
          <Text style={[styles.cardBody, { color: c.text }]}>{percent}%</Text>
          <View style={[styles.bar, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: c.primary, width: `${percent}%` }]} />
          </View>
          {topBlockers.length > 0 && (
            <View style={styles.blockerBox}>
              {topBlockers.map((b, idx) => (
                <Text key={idx} style={[styles.blockerText, { color: c.warning }]}>
                  ⚠ {b}
                </Text>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>Equipment</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.row}>
            {EQUIPMENT_IDS.map((id) => (
              <Pressable
                key={id}
                testID={`home-readiness-equipment-${id}`}
                style={[styles.chip, equipment.owned[id] && { backgroundColor: c.primary }]}
                onPress={() => equipment.toggleOwned(id)}
              >
                <Text style={{ color: equipment.owned[id] ? '#fff' : c.text, fontSize: 12 }}>
                  {equipmentLabel(id)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>Movement Patterns</Text>
        {patterns.map((p) => {
          const ready = p.equipmentReady && p.performanceReady && p.volumeReady && p.timeReady && p.painFree;
          return (
            <View
              key={p.pattern}
              testID={`pattern-${p.pattern}`}
              style={[styles.rowCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Text style={{ color: ready ? c.success : c.warning, marginRight: 10 }}>
                {ready ? '✓' : '○'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowText, { color: c.text }]}>
                  {p.pattern.replace(/_/g, ' ')}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {p.supportingExerciseOrSkill || 'No supporting skill/exercise'}
                </Text>
                {!ready && p.blockers.length > 0 && (
                  <Text style={{ color: c.warning, fontSize: 12, marginTop: 4 }}>
                    {p.blockers[0]}
                  </Text>
                )}
              </View>
              <Text style={{ color: ready ? c.success : c.textMuted }}>
                {ready ? 'Home Ready' : 'Blocked'}
              </Text>
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
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  fill: { height: '100%' },
  blockerBox: { marginTop: 8 },
  blockerText: { fontSize: 13, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#64748b' },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  rowText: { fontSize: 16, fontWeight: '600' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
