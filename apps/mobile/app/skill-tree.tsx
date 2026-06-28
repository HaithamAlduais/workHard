import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useSkillStore } from '../stores/skillStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useHomeReadiness } from '../lib/readiness';
import { familyPriorityStatus, missingPrerequisites } from '../lib/skillTree';
import {
  SKILL_FAMILIES,
  getNodesByFamily,
  getSkillNode,
  type SkillNode,
  type SkillUnlockState
} from '@gravitypath/domain';

const STATUS_COLORS: Record<SkillUnlockState['status'], string> = {
  locked: '#64748b',
  available: '#38bdf8',
  unlocked: '#4ade80',
  mastered: '#22c55e',
  safety_hold: '#f87171'
};

const STATUS_LABELS: Record<SkillUnlockState['status'], string> = {
  locked: 'Locked',
  available: 'Available',
  unlocked: 'Unlocked',
  mastered: 'Mastered',
  safety_hold: 'Safety hold'
};

const PRIORITY_LABELS: Record<string, string> = {
  active_primary: 'PRIMARY',
  active_secondary: 'SECONDARY',
  maintenance: 'MAINT',
  inactive: 'OFF'
};

export default function SkillTreeScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const unlockStates = useSkillStore((s) => s.getUnlockStates());
  const priority = useSkillPriorityStore();
  const skillPrescriptions = usePrescriptionStore((s) => s.skillPrescriptions);
  const { readiness } = useHomeReadiness();
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const familyStatus = (familyId: string): string => familyPriorityStatus(familyId, priority);

  const renderNodeRow = (node: SkillNode, index: number, nodes: SkillNode[]) => {
    const state = unlockStates.get(node.id);
    const status = state?.status ?? 'locked';
    const next = nodes[index + 1];
    const edgeUnlocked = status === 'unlocked' || status === 'mastered';

    return (
      <View key={node.id} style={styles.nodeColumn}>
        <Pressable onPress={() => setSelectedNode(node)} style={styles.nodeRow} testID={`skill-node-${node.id}`}>
          <View style={[styles.nodeCircle, { backgroundColor: STATUS_COLORS[status], borderColor: c.border }]}>
            <Text style={styles.nodeStage}>{node.stage}</Text>
          </View>
          <View style={styles.nodeText}>
            <Text style={[styles.nodeName, { color: c.text }]}>{isRTL && node.nameAr ? node.nameAr : node.name}</Text>
            <Text style={[styles.nodeMeta, { color: c.textMuted }]}>
              {STATUS_LABELS[status]} · {node.difficulty} · {node.role}
            </Text>
          </View>
        </Pressable>
        {next && (
          <View style={styles.connectorRow}>
            <View style={[styles.connector, { backgroundColor: edgeUnlocked ? STATUS_COLORS.unlocked : STATUS_COLORS.locked }]} />
          </View>
        )}
      </View>
    );
  };

  const renderDetail = () => {
    if (!selectedNode) return null;
    const state = unlockStates.get(selectedNode.id);
    const status = state?.status ?? 'locked';
    const prescription = skillPrescriptions[selectedNode.id];
    const familyStatusLabel = familyStatus(selectedNode.familyId);
    const missing = status === 'locked' ? missingPrerequisites(selectedNode, unlockStates) : [];

    const relatedStatus = (id: string) => {
      const s = unlockStates.get(id);
      return s?.status ?? 'locked';
    };

    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setSelectedNode(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.modalTitle, { color: c.text }]}>{isRTL && selectedNode.nameAr ? selectedNode.nameAr : selectedNode.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] }]}>
                <Text style={styles.statusBadgeText}>{STATUS_LABELS[status]}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: c.text }]}>Details</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>Stage {selectedNode.stage}</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>Difficulty: {selectedNode.difficulty}</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>Role: {selectedNode.role}</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>Family priority: {PRIORITY_LABELS[familyStatusLabel]}</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>Apparatus: {selectedNode.apparatus.join(', ') || 'None'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: c.text }]}>Target dose</Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>
                  {selectedNode.targetDose.sets ?? '-'} sets
                  {selectedNode.targetDose.repsMin !== undefined &&
                    ` · ${selectedNode.targetDose.repsMin}-${selectedNode.targetDose.repsMax} reps`}
                  {selectedNode.targetDose.holdSecondsMin !== undefined &&
                    ` · ${selectedNode.targetDose.holdSecondsMin}s hold`}
                </Text>
                <Text style={[styles.detailLine, { color: c.textMuted }]}>
                  Quality target: {Math.round((selectedNode.targetQuality ?? 0) * 100)}%
                </Text>
              </View>

              {prescription && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: c.text }]}>Current prescription</Text>
                  <Text style={[styles.detailLine, { color: c.textMuted }]}>
                    {prescription.targetSets} sets · target {prescription.targetRepsOrHoldSeconds} · state {prescription.progressionState}
                  </Text>
                </View>
              )}

              {selectedNode.progressions.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: c.text }]}>Next target</Text>
                  {selectedNode.progressions.map((id) => {
                    const n = getSkillNode(id);
                    return (
                      <Text key={id} style={[styles.detailLine, { color: c.textMuted }]}>
                        → {n ? (isRTL && n.nameAr ? n.nameAr : n.name) : id}
                      </Text>
                    );
                  })}
                </View>
              )}

              {selectedNode.prerequisites.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: c.text }]}>Prerequisites</Text>
                  {selectedNode.prerequisites.map((id) => {
                    const n = getSkillNode(id);
                    const s = relatedStatus(id);
                    return (
                      <View key={id} style={styles.relatedRow}>
                        <View style={[styles.dot, { backgroundColor: STATUS_COLORS[s] }]} />
                        <Text style={[styles.detailLine, { color: c.textMuted, flex: 1 }]}>
                          {n ? (isRTL && n.nameAr ? n.nameAr : n.name) : id}
                        </Text>
                      </View>
                    );
                  })}
                  {missing.length > 0 && (
                    <Text style={[styles.detailLine, { color: c.danger, marginTop: 6 }]}>
                      Missing: {missing.map((id) => getSkillNode(id)?.name ?? id).join(', ')}
                    </Text>
                  )}
                </View>
              )}

              {selectedNode.replacementCandidates.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: c.text }]}>Replacement candidates</Text>
                  {selectedNode.replacementCandidates.map((id) => (
                    <Text key={id} style={[styles.detailLine, { color: c.textMuted }]}>
                      ↔ {id.replace(/-/g, ' ')}
                    </Text>
                  ))}
                </View>
              )}

              {state?.reason && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: c.text }]}>Reason</Text>
                  <Text style={[styles.detailLine, { color: c.textMuted }]}>{state.reason}</Text>
                </View>
              )}

              <Pressable onPress={() => setSelectedNode(null)} style={[styles.button, { backgroundColor: c.primary, marginTop: 12 }]}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('skillTree')}</Text>

        <View style={[styles.legend, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.legendTitle, { color: c.text }]}>Legend</Text>
          <View style={styles.legendRow}>
            {(['locked', 'available', 'unlocked', 'mastered', 'safety_hold'] as const).map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{STATUS_LABELS[status]}</Text>
              </View>
            ))}
          </View>
        </View>

        {SKILL_FAMILIES.map((family) => {
          const nodes = getNodesByFamily(family.id).sort((a, b) => a.stage - b.stage);
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
                {nodes.map((node, index) => renderNodeRow(node, index, nodes))}
              </View>
            </View>
          );
        })}

        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonText}>{t('back') ?? 'Back'}</Text>
        </Pressable>
      </ScrollView>
      {renderDetail()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  familyCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  familyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  familyName: { fontSize: 18, fontWeight: '700', flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  priorityText: { fontSize: 10, fontWeight: '800' },
  nodes: { paddingLeft: 8 },
  nodeColumn: { alignItems: 'flex-start' },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nodeStage: { color: '#fff', fontSize: 12, fontWeight: '800' },
  nodeText: { flex: 1 },
  nodeName: { fontSize: 15, fontWeight: '600' },
  nodeMeta: { fontSize: 12, marginTop: 2 },
  connectorRow: { height: 24, justifyContent: 'center', paddingLeft: 15 },
  connector: { width: 2, height: 24 },
  legend: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  legendTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0
  },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  statusBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  detailLine: { fontSize: 14, marginBottom: 4 },
  relatedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }
});
