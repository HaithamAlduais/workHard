import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useSkillStore } from '../stores/skillStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { SKILL_FAMILIES, getNodesByFamily, type SkillUnlockState } from '@gravitypath/domain';

const STATUS_COLORS: Record<SkillUnlockState['status'], string> = {
  locked: '#64748b',
  available: '#38bdf8',
  unlocked: '#4ade80',
  mastered: '#22c55e',
  safety_hold: '#f87171'
};

const PRIORITY_LABELS: Record<string, string> = {
  active_primary: 'PRIMARY',
  active_secondary: 'SECONDARY',
  maintenance: 'MAINT',
  inactive: 'OFF',
  locked: 'LOCKED',
  safety_hold: 'HOLD'
};

export default function SkillTreeScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const unlockStates = useSkillStore((s) => s.getUnlockStates());
  const priority = useSkillPriorityStore();

  const familyStatus = (familyId: string): string => {
    if (priority.primarySkillFamilyId === familyId) return 'active_primary';
    if (priority.secondarySkillFamilyIds.includes(familyId)) return 'active_secondary';
    if (priority.inactiveSkillFamilyIds.includes(familyId)) return 'inactive';
    return 'maintenance';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('skillTree')}</Text>
        {SKILL_FAMILIES.map((family) => {
          const nodes = getNodesByFamily(family.id);
          const familyPriority = familyStatus(family.id);
          return (
            <View key={family.id} style={[styles.familyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.familyHeader}>
                <Text style={[styles.familyName, { color: c.text }]}>{isRTL && family.nameAr ? family.nameAr : family.name}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: familyPriority === 'active_primary' ? c.primary : c.surfaceHighlight }]}>
                  <Text style={[styles.priorityText, { color: familyPriority === 'active_primary' ? '#fff' : c.text }]}>
                    {PRIORITY_LABELS[familyPriority]}
                  </Text>
                </View>
              </View>
              <View style={styles.nodes}>
                {nodes.map((node) => {
                  const state = unlockStates.get(node.id);
                  const status = state?.status ?? 'locked';
                  return (
                    <View key={node.id} style={styles.nodeRow}>
                      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]} />
                      <View style={styles.nodeText}>
                        <Text style={[styles.nodeName, { color: c.text }]}>{isRTL && node.nameAr ? node.nameAr : node.name}</Text>
                        <Text style={[styles.nodeMeta, { color: c.textMuted }]}>
                          {node.difficulty} · {node.staticOrDynamic} · {status}
                        </Text>
                      </View>
                      {status === 'locked' && state?.reason && (
                        <Text style={[styles.reason, { color: c.textMuted }]}>?</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
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
  familyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  familyName: { fontSize: 18, fontWeight: '700', flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  priorityText: { fontSize: 10, fontWeight: '800' },
  nodes: { gap: 10 },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 12, height: 12, borderRadius: 6 },
  nodeText: { flex: 1 },
  nodeName: { fontSize: 15, fontWeight: '600' },
  nodeMeta: { fontSize: 12, marginTop: 2 },
  reason: { fontSize: 14, fontWeight: '700' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
