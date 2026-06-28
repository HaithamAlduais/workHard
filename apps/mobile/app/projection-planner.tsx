import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useProjectionStore, initializeProjectionFromCalibration } from '../stores/projectionStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import {
  getProjectionExerciseConfig,
  getProjectionSkillFamilyConfig,
  projectionExerciseIds,
  projectionSkillFamilyIds,
  type ProjectionExerciseConfig,
  type ProjectionSkillFamilyConfig,
  type ProjectedWeek,
  type ProjectedExerciseEntry,
  type ProjectedSkillEntry
} from '@gravitypath/domain';

type Tab = 'weeks' | 'exercise' | 'skill';

const SPEED_OPTIONS: Array<{ value: 'conservative' | 'moderate' | 'aggressive'; key: string }> = [
  { value: 'conservative', key: 'conservative' },
  { value: 'moderate', key: 'moderate' },
  { value: 'aggressive', key: 'aggressive' }
];

function groupByDay(exerciseIds: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = { day1: [], day2: [], day3: [] };
  for (const id of exerciseIds) {
    const config = getProjectionExerciseConfig(id);
    if (config) {
      groups[config.dayId].push(id);
    }
  }
  return groups;
}

function downloadWeb(filename: string, content: string, type: string) {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectionPlannerScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL } = useI18n();
  const calibration = useCalibrationStore();
  const priorities = useSkillPriorityStore();
  const store = useProjectionStore();

  const [activeTab, setActiveTab] = useState<Tab>('weeks');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [exportTitle, setExportTitle] = useState<string>('');

  useEffect(() => {
    initializeProjectionFromCalibration(calibration);
  }, [calibration]);

  const exerciseGroups = useMemo(() => groupByDay(projectionExerciseIds()), []);
  const skillFamilies = useMemo(() => projectionSkillFamilyIds().map((id) => getProjectionSkillFamilyConfig(id)!), []);

  const handleGenerate = useCallback(() => {
    store.generateProjection(
      {
        primarySkillFamilyId: priorities.primarySkillFamilyId,
        secondarySkillFamilyIds: priorities.secondarySkillFamilyIds,
        maintenanceSkillFamilyIds: priorities.maintenanceSkillFamilyIds,
        inactiveSkillFamilyIds: priorities.inactiveSkillFamilyIds
      },
      70
    );
    setActiveTab('weeks');
  }, [store, priorities]);

  const handleExportCSV = useCallback(() => {
    const content = store.exportCSV();
    if (Platform.OS === 'web') {
      downloadWeb('gravitypath-projection.csv', content, 'text/csv');
    } else {
      setExportTitle(t('exportCSV'));
      setExportContent(content);
    }
  }, [store, t]);

  const handleExportJSON = useCallback(() => {
    const content = store.exportJSON();
    if (Platform.OS === 'web') {
      downloadWeb('gravitypath-projection.json', content, 'application/json');
    } else {
      setExportTitle(t('exportJSON'));
      setExportContent(content);
    }
  }, [store, t]);

  const numericInput = (value: number, onChange: (n: number) => void, testID?: string) => (
    <TextInput
      testID={testID}
      style={[
        styles.numericInput,
        {
          backgroundColor: c.surface,
          color: c.text,
          borderColor: c.border,
          textAlign: isRTL ? 'right' : 'left'
        }
      ]}
      value={String(value)}
      onChangeText={(text) => {
        const n = parseFloat(text);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      keyboardType="numeric"
    />
  );

  const renderSettings = () => (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{t('planSettings')}</Text>

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>{t('durationWeeks')}</Text>
        {numericInput(store.settings.durationWeeks, (v) => store.setSetting('durationWeeks', Math.max(1, Math.round(v))), 'projection-duration-weeks')}
      </View>

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>{t('deloadFrequency')}</Text>
        {numericInput(store.settings.deloadFrequency, (v) => store.setSetting('deloadFrequency', Math.max(0, Math.round(v))), 'projection-deload-frequency')}
      </View>

      <Text style={[styles.label, { color: c.text, marginTop: 12 }]}>{t('progressionSpeed')}</Text>
      <View style={styles.chipRow}>
        {SPEED_OPTIONS.map((opt) => {
          const active = store.settings.speed === opt.value;
          return (
            <Pressable
              key={opt.value}
              testID={`projection-speed-${opt.value}`}
              onPress={() => store.setSetting('speed', opt.value)}
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: active ? c.primary : c.background }
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : c.text }]}>{t(opt.key)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>Upper-body increment (kg)</Text>
        {numericInput(store.settings.upperBodyIncrementKg, (v) => store.setSetting('upperBodyIncrementKg', v))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>Lower-body increment (kg)</Text>
        {numericInput(store.settings.lowerBodyIncrementKg, (v) => store.setSetting('lowerBodyIncrementKg', v))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>Dumbbell increment (kg)</Text>
        {numericInput(store.settings.dumbbellIncrementKg, (v) => store.setSetting('dumbbellIncrementKg', v))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>Machine increment (kg)</Text>
        {numericInput(store.settings.machineIncrementKg, (v) => store.setSetting('machineIncrementKg', v))}
      </View>

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: c.text }]}>{t('unitSystem')}</Text>
        <View style={styles.chipRow}>
          {(['metric', 'imperial'] as const).map((u) => {
            const active = store.settings.unitSystem === u;
            return (
              <Pressable
                key={u}
                onPress={() => store.setSetting('unitSystem', u)}
                style={[styles.chip, { borderColor: c.border, backgroundColor: active ? c.primary : c.background }]}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : c.text }]}>{t(u)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderGymWeights = () => (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{t('gymWeights')}</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>Enter current working weight where you have one.</Text>
      {(['day1', 'day2', 'day3'] as const).map((dayId) => (
        <View key={dayId} style={{ marginTop: 12 }}>
          <Text style={[styles.dayTitle, { color: c.textMuted }]}>{dayId.toUpperCase()}</Text>
          {exerciseGroups[dayId].map((exerciseId) => {
            const config = getProjectionExerciseConfig(exerciseId)!;
            const label = exerciseId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            const suffix = config.loadType === 'dumbbell' ? 'per hand' : '';
            return (
              <View key={exerciseId} style={styles.rowBetween}>
                <Text style={[styles.label, { color: c.text, flex: 1 }]}>
                  {label} {suffix ? `(${suffix})` : ''}
                </Text>
                {numericInput(
                  store.gymInputs[exerciseId] ?? 0,
                  (v) => store.setGymInput(exerciseId, v),
                  `projection-weight-${exerciseId}`
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderSkillLevels = () => (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{t('skillLevels')}</Text>
      {skillFamilies.map((family) => {
        const level = store.skillLevels[family.familyId] ?? 0;
        return (
          <View key={family.familyId} style={styles.skillRow}>
            <Text style={[styles.label, { color: c.text, flex: 1 }]}>
              {isRTL && family.nameAr ? family.nameAr : family.name}
            </Text>
            <View style={styles.levelRow}>
              {[0, 1, 2, 3, 4, 5].map((l) => {
                const active = level === l;
                return (
                  <Pressable
                    key={l}
                    testID={`projection-skill-${family.familyId}-${l}`}
                    onPress={() => store.setSkillLevel(family.familyId, l)}
                    style={[
                      styles.levelChip,
                      { borderColor: c.border, backgroundColor: active ? c.primary : c.background }
                    ]}
                  >
                    <Text style={[styles.levelChipText, { color: active ? '#fff' : c.text }]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderWeekTable = () => {
    if (!store.projection) return null;
    return (
      <View style={{ marginTop: 8 }}>
        {store.projection.weeks.map((week) => (
          <View
            key={week.weekNumber}
            testID={`projection-week-${week.weekNumber}`}
            style={[styles.weekCard, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <View style={styles.weekHeader}>
              <Text style={[styles.weekTitle, { color: c.text }]}>
                {t('week')} {week.weekNumber}
              </Text>
              {week.isDeload && (
                <View style={[styles.deloadBadge, { backgroundColor: c.warning }]}>
                  <Text style={styles.deloadBadgeText}>{t('deload')}</Text>
                </View>
              )}
            </View>
            {week.exerciseEntries.slice(0, 6).map((entry) => (
              <View key={entry.exerciseId} style={styles.entryRow}>
                <Text style={[styles.entryDay, { color: c.textMuted }]}>{entry.dayId}</Text>
                <Text style={[styles.entryName, { color: c.text }]}>{entry.exerciseName}</Text>
                <Text style={[styles.entryDetail, { color: c.textMuted }]}>
                  {entry.sets}×{entry.holdSeconds ? `${entry.holdSeconds}s` : entry.repTargets.join('/')}
                </Text>
                <Text style={[styles.entryLoad, { color: c.text }]}>{entry.loadDisplay}</Text>
              </View>
            ))}
            {week.skillEntries.slice(0, 3).map((entry) => (
              <View key={entry.familyId} style={styles.entryRow}>
                <Text style={[styles.entryDay, { color: c.textMuted }]}>Skill</Text>
                <Text style={[styles.entryName, { color: c.text }]}>{entry.familyName}</Text>
                <Text style={[styles.entryDetail, { color: c.textMuted }]}>
                  {entry.targetSets}×
                  {entry.targetRepsOrHoldSeconds > 0 ? `${entry.targetRepsOrHoldSeconds}s` : 'reps'}
                </Text>
                <Text style={[styles.entryLoad, { color: c.text }]}>L{entry.level}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderExerciseProgression = () => {
    if (!store.projection) return null;
    const exerciseIds = Array.from(new Set(store.projection.weeks.flatMap((w) => w.exerciseEntries.map((e) => e.exerciseId))));
    const currentId = selectedExercise || exerciseIds[0] || '';
    const rows = store.projection.weeks.map((w) => w.exerciseEntries.find((e) => e.exerciseId === currentId));
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 12 }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Exercise Progression</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.chipRow}>
            {exerciseIds.map((id) => (
              <Pressable
                key={id}
                onPress={() => setSelectedExercise(id)}
                style={[
                  styles.chip,
                  { borderColor: c.border, backgroundColor: currentId === id ? c.primary : c.background }
                ]}
              >
                <Text style={[styles.chipText, { color: currentId === id ? '#fff' : c.text }]}>
                  {id.replace(/-/g, ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {rows.map((entry, idx) =>
          entry ? (
            <View key={idx} style={styles.entryRow}>
              <Text style={[styles.entryDay, { color: c.textMuted }]}>W{idx + 1}</Text>
              <Text style={[styles.entryName, { color: c.text }]}>{entry.loadDisplay}</Text>
              <Text style={[styles.entryDetail, { color: c.textMuted }]}>
                {entry.sets}×{entry.holdSeconds ? `${entry.holdSeconds}s` : entry.repTargets.join('/')}
              </Text>
              {entry.isDeload && <Text style={{ color: c.warning }}>{t('deload')}</Text>}
            </View>
          ) : null
        )}
      </View>
    );
  };

  const renderSkillProgression = () => {
    if (!store.projection) return null;
    const familyIds = Array.from(new Set(store.projection.weeks.flatMap((w) => w.skillEntries.map((s) => s.familyId))));
    const currentId = selectedSkill || familyIds[0] || '';
    const rows = store.projection.weeks.map((w) => w.skillEntries.find((s) => s.familyId === currentId));
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 12 }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Skill Progression</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.chipRow}>
            {familyIds.map((id) => {
              const config = getProjectionSkillFamilyConfig(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedSkill(id)}
                  style={[
                    styles.chip,
                    { borderColor: c.border, backgroundColor: currentId === id ? c.primary : c.background }
                  ]}
                >
                  <Text style={[styles.chipText, { color: currentId === id ? '#fff' : c.text }]}>
                    {config ? (isRTL && config.nameAr ? config.nameAr : config.name) : id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {rows.map((entry, idx) =>
          entry ? (
            <View key={idx} style={styles.entryRow}>
              <Text style={[styles.entryDay, { color: c.textMuted }]}>W{idx + 1}</Text>
              <Text style={[styles.entryName, { color: c.text }]}>{entry.nodeName}</Text>
              <Text style={[styles.entryDetail, { color: c.textMuted }]}>
                {entry.targetSets}×
                {entry.targetRepsOrHoldSeconds > 0 ? `${entry.targetRepsOrHoldSeconds}s` : 'reps'}
              </Text>
              <Text style={[styles.entryLoad, { color: c.text }]}>L{entry.level}</Text>
              {entry.isDeload && <Text style={{ color: c.warning }}>{t('deload')}</Text>}
            </View>
          ) : null
        )}
      </View>
    );
  };

  const renderOutput = () => {
    if (!store.projection) return null;
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>{t('projectedPlan')}</Text>
        <Text style={[styles.disclaimer, { color: c.warning }]}>{t('actualMayDiffer')}</Text>

        <View style={styles.tabBar}>
          {[
            { key: 'weeks', label: 'Week Table' },
            { key: 'exercise', label: 'Exercise' },
            { key: 'skill', label: 'Skill' }
          ].map((tab) => {
            const active = activeTab === (tab.key as Tab);
            return (
              <Pressable
                key={tab.key}
                testID={`projection-tab-${tab.key}`}
                onPress={() => setActiveTab(tab.key as Tab)}
                style={[styles.tab, { borderColor: c.border, backgroundColor: active ? c.primary : c.background }]}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : c.text }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'weeks' && renderWeekTable()}
        {activeTab === 'exercise' && renderExerciseProgression()}
        {activeTab === 'skill' && renderSkillProgression()}

        <View style={styles.exportRow}>
          <Pressable
            testID="projection-export-csv"
            onPress={handleExportCSV}
            style={[styles.exportButton, { backgroundColor: c.surfaceHighlight, borderColor: c.border }]}
          >
            <Text style={{ color: c.text, fontWeight: '700' }}>{t('exportCSV')}</Text>
          </Pressable>
          <Pressable
            testID="projection-export-json"
            onPress={handleExportJSON}
            style={[styles.exportButton, { backgroundColor: c.surfaceHighlight, borderColor: c.border }]}
          >
            <Text style={{ color: c.text, fontWeight: '700' }}>{t('exportJSON')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('projectionPlanner')}</Text>
        <Text style={[styles.disclaimer, { color: c.warning }]}>{t('actualMayDiffer')}</Text>

        {renderSettings()}
        {renderGymWeights()}
        {renderSkillLevels()}

        <Pressable
          testID="projection-generate"
          onPress={handleGenerate}
          style={[styles.generateButton, { backgroundColor: c.primary }]}
        >
          <Text style={styles.generateButtonText}>{t('generateProjection')}</Text>
        </Pressable>

        {renderOutput()}

        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonText}>{t('back')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={exportContent !== null} transparent animationType="slide" onRequestClose={() => setExportContent(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{exportTitle}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[styles.exportText, { color: c.textMuted }]}>{exportContent}</Text>
            </ScrollView>
            <Pressable onPress={() => setExportContent(null)} style={[styles.button, { backgroundColor: c.primary, marginTop: 12 }]}>
              <Text style={styles.buttonText}>{t('close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  disclaimer: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  hint: { fontSize: 13, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 },
  label: { fontSize: 14, fontWeight: '600' },
  numericInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '600'
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  dayTitle: { fontSize: 12, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  levelRow: { flexDirection: 'row', gap: 6 },
  levelChip: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelChipText: { fontSize: 13, fontWeight: '700' },
  generateButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  weekCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekTitle: { fontSize: 16, fontWeight: '700' },
  deloadBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deloadBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  entryDay: { width: 40, fontSize: 12 },
  entryName: { flex: 1, fontSize: 13, fontWeight: '600' },
  entryDetail: { width: 60, fontSize: 12, textAlign: 'right' },
  entryLoad: { width: 70, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  exportButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  exportText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
});
