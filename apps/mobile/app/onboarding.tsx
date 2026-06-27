import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useScheduleStore } from '../stores/scheduleStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { useEquipmentStore, EQUIPMENT_IDS } from '../stores/equipmentStore';
import { useGraduationStore } from '../stores/graduationStore';
import {
  SKILL_FAMILIES,
  SKILL_NODES,
  validateSkillPriority,
  checkSkillPriorityConflicts,
  createGraduationContract,
  type SkillPriority,
  type GraduationTemplate
} from '@gravitypath/domain';

const EXERCISE_CALIBRATION_IDS = [
  'back-squat',
  'bench-press',
  'trap-bar-deadlift',
  'overhead-press',
  'front-squat',
  'low-incline-press',
  'romanian-deadlift',
  'weighted-pull-up'
];

const GOAL_TEMPLATES: { id: SkillPriority['goalTemplate']; label: string }[] = [
  { id: 'practical_home', label: 'Practical Home Independence' },
  { id: 'advanced_calisthenics', label: 'Advanced Calisthenics' },
  { id: 'elite_mastery', label: 'Elite Mastery' }
];

const GRADUATION_TEMPLATES: { id: GraduationTemplate; label: string }[] = [
  { id: 'PRACTICAL_HOME_INDEPENDENCE', label: 'Practical Home' },
  { id: 'ADVANCED_CALISTHENICS_GRADUATION', label: 'Advanced Calisthenics' },
  { id: 'ELITE_MASTERY', label: 'Elite Mastery' }
];

function equipmentLabel(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Onboarding() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL, setLocale, locale } = useI18n();
  const { setTrainingDays } = useScheduleStore();
  const calibration = useCalibrationStore();
  const skillPriority = useSkillPriorityStore();
  const equipment = useEquipmentStore();
  const graduation = useGraduationStore();

  const [name, setName] = useState(calibration.profile.name);
  const [unit, setUnit] = useState<'metric' | 'imperial'>(calibration.profile.unitSystem);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [startingNodeId, setStartingNodeId] = useState<string | null>(
    calibration.skillStartingNodesByFamily[skillPriority.primarySkillFamilyId] || null
  );
  const [selectedGraduation, setSelectedGraduation] = useState<GraduationTemplate | null>(
    graduation.selectedTemplate
  );

  const skillNodes = SKILL_NODES.filter(
    (n) => n.familyId === skillPriority.primarySkillFamilyId && n.stage <= 4
  );

  const validation = useMemo(() => validateSkillPriority(skillPriority), [skillPriority]);
  const warnings = useMemo(
    () => checkSkillPriorityConflicts(skillPriority, usePrescriptionStore.getState().skillPrescriptions),
    [skillPriority]
  );

  const toggleDay = (d: number) => {
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 3) return prev;
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const setPrimaryFamily = (familyId: string) => {
    skillPriority.setPrimary(familyId);
    const nodes = SKILL_NODES.filter((n) => n.familyId === familyId && n.stage <= 4).sort(
      (a, b) => a.stage - b.stage
    );
    const selected = nodes[nodes.length - 1]?.id ?? null;
    setStartingNodeId(selected);
    if (selected) {
      calibration.setSkillStartingNodeByFamily(familyId, selected);
    }
  };

  const updateStartingNode = (nodeId: string) => {
    setStartingNodeId(nodeId);
    calibration.setSkillStartingNodeByFamily(skillPriority.primarySkillFamilyId, nodeId);
  };

  const updateLoad = (exerciseId: string, value: string) => {
    const num = parseFloat(value);
    calibration.setExerciseLoad(exerciseId, Number.isNaN(num) ? 0 : num);
  };

  const toggleEquipment = (id: string) => {
    equipment.toggleOwned(id);
  };

  const save = () => {
    if (!validation.valid || days.length !== 3) return;
    calibration.setProfile({
      name,
      unitSystem: unit,
      primarySkillFamilyId: skillPriority.primarySkillFamilyId
    });
    if (startingNodeId) {
      calibration.setSkillStartingNodeByFamily(skillPriority.primarySkillFamilyId, startingNodeId);
    }
    if (selectedGraduation) {
      graduation.selectTemplate(selectedGraduation);
      graduation.setContract(createGraduationContract(selectedGraduation, 'local'));
    }
    calibration.completeCalibration();
    const freshCalibration = useCalibrationStore.getState();
    usePrescriptionStore.getState().initializePrescriptions('local', freshCalibration);
    usePrescriptionStore.getState().recomputeSkillStatuses();
    setTrainingDays(days);
    router.back();
  };

  const dayNames = isRTL
    ? ['أحد', 'إثن', 'ثلاث', 'أرب', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const unitLabel = unit === 'metric' ? 'kg' : 'lb';

  const renderPriorityButton = (
    familyId: string,
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <Pressable
      key={label}
      testID={`priority-${familyId}-${label.toLowerCase()}`}
      style={[
        styles.priorityChip,
        active && { backgroundColor: c.primary },
        { borderColor: c.border }
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? '#fff' : c.text, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('onboarding')}</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>{t('language') ?? 'Language'}</Text>
          <View style={styles.row}>
            <Pressable style={[styles.chip, locale === 'en' && { backgroundColor: c.primary }]} onPress={() => setLocale('en')}>
              <Text style={{ color: locale === 'en' ? '#fff' : c.text }}>English</Text>
            </Pressable>
            <Pressable style={[styles.chip, locale === 'ar' && { backgroundColor: c.primary }]} onPress={() => setLocale('ar')}>
              <Text style={{ color: locale === 'ar' ? '#fff' : c.text }}>العربية</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>{t('name')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border, textAlign: isRTL ? 'right' : 'left' }]}
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            placeholderTextColor={c.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>{t('unitSystem')}</Text>
          <View style={styles.row}>
            <Pressable style={[styles.chip, unit === 'metric' && { backgroundColor: c.primary }]} onPress={() => setUnit('metric')}>
              <Text style={{ color: unit === 'metric' ? '#fff' : c.text }}>{t('metric')}</Text>
            </Pressable>
            <Pressable style={[styles.chip, unit === 'imperial' && { backgroundColor: c.primary }]} onPress={() => setUnit('imperial')}>
              <Text style={{ color: unit === 'imperial' ? '#fff' : c.text }}>{t('imperial')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>{t('trainingDays')}</Text>
          <View style={styles.row}>
            {dayNames.map((label, idx) => (
              <Pressable
                key={idx}
                style={[styles.dayChip, days.includes(idx) && { backgroundColor: c.primary }]}
                onPress={() => toggleDay(idx)}
              >
                <Text style={{ color: days.includes(idx) ? '#fff' : c.text, fontSize: 12 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>Goal Template</Text>
          <View style={styles.row}>
            {GOAL_TEMPLATES.map((template) => (
              <Pressable
                key={template.id}
                style={[styles.chip, skillPriority.goalTemplate === template.id && { backgroundColor: c.primary }]}
                onPress={() => skillPriority.setGoalTemplate(template.id)}
              >
                <Text style={{ color: skillPriority.goalTemplate === template.id ? '#fff' : c.text }}>{template.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>{t('primarySkill')}</Text>
          {SKILL_FAMILIES.filter((f) => f.id !== 'expert-rings').map((family) => {
            const isPrimary = skillPriority.primarySkillFamilyId === family.id;
            const isSecondary = skillPriority.secondarySkillFamilyIds.includes(family.id);
            const isMaintenance = skillPriority.maintenanceSkillFamilyIds.includes(family.id);
            const isInactive = skillPriority.inactiveSkillFamilyIds.includes(family.id);
            return (
              <View key={family.id} style={[styles.skillRow, { borderColor: c.border }]}>
                <Text style={[styles.skillName, { color: c.text }]}>
                  {isRTL && family.nameAr ? family.nameAr : family.name}
                </Text>
                <View style={styles.priorityRow}>
                  {renderPriorityButton(family.id, 'Primary', isPrimary, () => setPrimaryFamily(family.id))}
                  {renderPriorityButton(family.id, 'Secondary', isSecondary, () => skillPriority.toggleSecondary(family.id))}
                  {renderPriorityButton(family.id, 'Maint.', isMaintenance, () => skillPriority.toggleMaintenance(family.id))}
                  {renderPriorityButton(family.id, 'Off', isInactive, () => skillPriority.toggleInactive(family.id))}
                </View>
              </View>
            );
          })}
        </View>

        {skillNodes.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Starting Node</Text>
            {skillNodes.map((node) => (
              <Pressable
                key={node.id}
                style={[styles.option, startingNodeId === node.id && { borderColor: c.primary }]}
                onPress={() => updateStartingNode(node.id)}
              >
                <Text style={{ color: c.text }}>
                  {isRTL && node.nameAr ? node.nameAr : node.name} (stage {node.stage})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {warnings.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.warning }]}>Priority Warnings</Text>
            {warnings.map((warning, idx) => (
              <Text key={idx} style={[styles.warningText, { color: c.warning }]}>
                ⚠ {warning.message}
              </Text>
            ))}
          </View>
        )}

        {!validation.valid && (
          <View style={styles.field}>
            {validation.errors.map((error, idx) => (
              <Text key={idx} style={[styles.warningText, { color: c.danger }]}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>Equipment Inventory</Text>
          <Text style={{ color: c.textMuted, marginBottom: 8 }}>Mark what you have access to at home.</Text>
          <View style={styles.row}>
            {EQUIPMENT_IDS.map((id) => (
              <Pressable
                key={id}
                testID={`equipment-${id}`}
                style={[
                  styles.chip,
                  equipment.owned[id] && { backgroundColor: c.primary }
                ]}
                onPress={() => toggleEquipment(id)}
              >
                <Text style={{ color: equipment.owned[id] ? '#fff' : c.text, fontSize: 12 }}>
                  {equipmentLabel(id)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>Graduation Contract</Text>
          <Text style={{ color: c.textMuted, marginBottom: 8 }}>Choose your long-term goal.</Text>
          <View style={styles.row}>
            {GRADUATION_TEMPLATES.map((template) => (
              <Pressable
                key={template.id}
                testID={`graduation-${template.id}`}
                style={[
                  styles.chip,
                  selectedGraduation === template.id && { backgroundColor: c.primary }
                ]}
                onPress={() => setSelectedGraduation(template.id)}
              >
                <Text style={{ color: selectedGraduation === template.id ? '#fff' : c.text, fontSize: 12 }}>
                  {template.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.text }]}>Exercise Calibration</Text>
          {EXERCISE_CALIBRATION_IDS.map((exerciseId) => (
            <View key={exerciseId} style={[styles.loadRow, { borderColor: c.border }]}>
              <Text style={[styles.loadLabel, { color: c.text }]}>
                {exerciseId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
              <TextInput
                style={[styles.loadInput, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                keyboardType="numeric"
                defaultValue={String(calibration.getCalibrationLoad(exerciseId) ?? 0)}
                onChangeText={(value) => updateLoad(exerciseId, value)}
                placeholder="0"
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.loadUnit, { color: c.textMuted }]}>{unitLabel}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: c.primary }, (!validation.valid || days.length !== 3) && styles.buttonDisabled]}
          onPress={save}
          disabled={!validation.valid || days.length !== 3}
        >
          <Text style={styles.buttonText}>{t('save')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#64748b' },
  dayChip: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#64748b', minWidth: 42, alignItems: 'center' },
  option: { padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 8, borderColor: '#64748b' },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8
  },
  skillName: { flex: 1, fontSize: 14, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  priorityChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#64748b' },
  warningText: { fontSize: 13, marginBottom: 4 },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 10
  },
  loadLabel: { flex: 1, fontSize: 14, textTransform: 'capitalize' },
  loadInput: { width: 80, borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'center' },
  loadUnit: { width: 30, fontSize: 14 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
