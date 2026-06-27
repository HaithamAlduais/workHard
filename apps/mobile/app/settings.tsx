import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n, Locale } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSkillPriorityStore } from '../stores/skillPriorityStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { useEquipmentStore, EQUIPMENT_IDS } from '../stores/equipmentStore';
import { useGraduationStore } from '../stores/graduationStore';
import {
  SKILL_FAMILIES,
  validateSkillPriority,
  checkSkillPriorityConflicts,
  createGraduationContract,
  type SkillPriority,
  type GraduationTemplate
} from '@gravitypath/domain';

const GOAL_TEMPLATES: { id: SkillPriority['goalTemplate']; label: string }[] = [
  { id: 'practical_home', label: 'Practical Home' },
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

export default function SettingsScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, locale, setLocale, isRTL } = useI18n();
  const { user } = useAuth();
  const { trainingDays, setTrainingDays } = useScheduleStore();
  const skillPriority = useSkillPriorityStore();
  const equipment = useEquipmentStore();
  const graduation = useGraduationStore();
  const [selectedDays, setSelectedDays] = useState<number[]>(trainingDays);
  const [blockLength, setBlockLength] = useState(String(skillPriority.blockLengthWeeks || 12));

  const switchLocale = (l: Locale) => setLocale(l);

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 3) return prev;
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const saveTrainingDays = () => {
    if (selectedDays.length !== 3) return;
    setTrainingDays(selectedDays);
  };

  const saveBlockLength = () => {
    const weeks = parseInt(blockLength, 10);
    if (!Number.isNaN(weeks) && weeks > 0) {
      skillPriority.setPriority({ blockLengthWeeks: weeks });
    }
  };

  const validation = validateSkillPriority(skillPriority);
  const warnings = checkSkillPriorityConflicts(skillPriority, usePrescriptionStore.getState().skillPrescriptions);

  const renderPriorityButton = (
    familyId: string,
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <Pressable
      key={label}
      testID={`settings-priority-${familyId}-${label.toLowerCase()}`}
      style={[
        styles.priorityChip,
        active && { backgroundColor: c.primary },
        { borderColor: c.border }
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? '#fff' : c.text, fontSize: 11 }}>{label}</Text>
    </Pressable>
  );

  const dayNames = isRTL
    ? ['أحد', 'إثن', 'ثلاث', 'أرب', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('settings')}</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('language') ?? 'Language'}</Text>
          <View style={styles.row}>
            <Pressable style={[styles.chip, locale === 'en' && { backgroundColor: c.primary }]} onPress={() => switchLocale('en')}>
              <Text style={{ color: locale === 'en' ? '#fff' : c.text }}>English</Text>
            </Pressable>
            <Pressable style={[styles.chip, locale === 'ar' && { backgroundColor: c.primary }]} onPress={() => switchLocale('ar')}>
              <Text style={{ color: locale === 'ar' ? '#fff' : c.text }}>العربية</Text>
            </Pressable>
          </View>
          <Text style={{ color: c.textMuted, marginTop: 8 }}>RTL: {isRTL ? 'On' : 'Off'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('trainingDays')}</Text>
          <View style={styles.row}>
            {dayNames.map((label, idx) => (
              <Pressable
                key={idx}
                style={[styles.dayChip, selectedDays.includes(idx) && { backgroundColor: c.primary }]}
                onPress={() => toggleDay(idx)}
              >
                <Text style={{ color: selectedDays.includes(idx) ? '#fff' : c.text, fontSize: 12 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: c.primary }, selectedDays.length !== 3 && styles.buttonDisabled]}
            onPress={saveTrainingDays}
            disabled={selectedDays.length !== 3}
          >
            <Text style={styles.buttonText}>{t('save') ?? 'Save'}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Skill Priorities</Text>
          <Text style={{ color: c.textMuted, marginBottom: 12 }}>Choose 1 primary and up to 2 secondary skills.</Text>

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
                  {renderPriorityButton(family.id, 'Primary', isPrimary, () => skillPriority.setPrimary(family.id))}
                  {renderPriorityButton(family.id, 'Secondary', isSecondary, () => skillPriority.toggleSecondary(family.id))}
                  {renderPriorityButton(family.id, 'Maint.', isMaintenance, () => skillPriority.toggleMaintenance(family.id))}
                  {renderPriorityButton(family.id, 'Off', isInactive, () => skillPriority.toggleInactive(family.id))}
                </View>
              </View>
            );
          })}

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Goal Template</Text>
            <View style={styles.row}>
              {GOAL_TEMPLATES.map((template) => (
                <Pressable
                  key={template.id}
                  style={[styles.chip, skillPriority.goalTemplate === template.id && { backgroundColor: c.primary }]}
                  onPress={() => skillPriority.setGoalTemplate(template.id)}
                >
                  <Text style={{ color: skillPriority.goalTemplate === template.id ? '#fff' : c.text, fontSize: 12 }}>{template.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>Block Length (weeks)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                keyboardType="numeric"
                value={blockLength}
                onChangeText={setBlockLength}
                onBlur={saveBlockLength}
              />
              <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={() => skillPriority.startNewBlock(parseInt(blockLength, 10) || 12)}>
                <Text style={styles.buttonText}>Start New Block</Text>
              </Pressable>
            </View>
          </View>

          {warnings.length > 0 && (
            <View style={styles.field}>
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

          <Pressable
            style={[styles.button, { backgroundColor: c.primary }]}
            onPress={() => usePrescriptionStore.getState().recomputeSkillStatuses()}
          >
            <Text style={styles.buttonText}>Apply Priorities</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Equipment Inventory</Text>
          <Text style={{ color: c.textMuted, marginBottom: 12 }}>Toggle the equipment you have at home.</Text>
          <View style={styles.row}>
            {EQUIPMENT_IDS.map((id) => (
              <Pressable
                key={id}
                testID={`settings-equipment-${id}`}
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

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Graduation Contract</Text>
          <Text style={{ color: c.textMuted, marginBottom: 12 }}>Choose or update your long-term contract.</Text>
          <View style={styles.row}>
            {GRADUATION_TEMPLATES.map((template) => (
              <Pressable
                key={template.id}
                testID={`settings-graduation-${template.id}`}
                style={[
                  styles.chip,
                  graduation.selectedTemplate === template.id && { backgroundColor: c.primary }
                ]}
                onPress={() => graduation.selectTemplate(template.id)}
              >
                <Text
                  style={{
                    color: graduation.selectedTemplate === template.id ? '#fff' : c.text,
                    fontSize: 12
                  }}
                >
                  {template.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: c.primary }]}
            onPress={() => {
              if (graduation.selectedTemplate) {
                graduation.setContract(createGraduationContract(graduation.selectedTemplate, 'local'));
              }
            }}
          >
            <Text style={styles.buttonText}>Apply Contract</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('unitSystem')}</Text>
          <Text style={{ color: c.textMuted }}>Metric / Imperial toggle coming from profile.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Account</Text>
          <Text style={{ color: c.textMuted }}>{user?.email ?? 'Not signed in'}</Text>
        </View>

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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#64748b' },
  dayChip: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#64748b', minWidth: 42, alignItems: 'center' },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, paddingHorizontal: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8
  },
  skillName: { flex: 1, fontSize: 13, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#64748b' },
  field: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  warningText: { fontSize: 13, marginBottom: 4 }
});
