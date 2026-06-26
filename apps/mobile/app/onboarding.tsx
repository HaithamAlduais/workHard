import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useScheduleStore } from '../stores/scheduleStore';
import { useCalibrationStore } from '../stores/calibrationStore';
import { usePrescriptionStore } from '../stores/prescriptionStore';
import { SKILL_NODES, getSkillNode } from '@gravitypath/domain';

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

export default function Onboarding() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL, setLocale, locale } = useI18n();
  const { setTrainingDays } = useScheduleStore();
  const calibration = useCalibrationStore();

  const [name, setName] = useState(calibration.profile.name);
  const [unit, setUnit] = useState<'metric' | 'imperial'>(calibration.profile.unitSystem);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [primarySkill, setPrimarySkill] = useState(
    calibration.profile.primarySkillFamilyId || 'handstand'
  );
  const [startingNodeId, setStartingNodeId] = useState<string | null>(
    calibration.skillStartingNodes[primarySkill] || null
  );

  const skillNodes = SKILL_NODES.filter(
    (n) => n.familyId === primarySkill && n.stage <= 4
  );

  const toggleDay = (d: number) => {
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 3) return prev;
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const updatePrimarySkill = (skill: string) => {
    setPrimarySkill(skill);
    const nodes = SKILL_NODES.filter((n) => n.familyId === skill && n.stage <= 4);
    const selected = nodes[0]?.id ?? null;
    setStartingNodeId(selected);
    if (selected) {
      calibration.setSkillStartingNode(selected, selected);
    }
  };

  const updateStartingNode = (nodeId: string) => {
    setStartingNodeId(nodeId);
    calibration.setSkillStartingNode(nodeId, nodeId);
  };

  const updateLoad = (exerciseId: string, value: string) => {
    const num = parseFloat(value);
    calibration.setExerciseLoad(exerciseId, Number.isNaN(num) ? 0 : num);
  };

  const save = () => {
    calibration.setProfile({
      name,
      unitSystem: unit,
      primarySkillFamilyId: primarySkill
    });
    if (startingNodeId) {
      calibration.setSkillStartingNode(startingNodeId, startingNodeId);
    }
    calibration.completeCalibration();
    usePrescriptionStore.getState().initializePrescriptions('local', useCalibrationStore.getState());
    setTrainingDays(days);
    router.back();
  };

  const dayNames = isRTL
    ? ['أحد', 'إثن', 'ثلاث', 'أرب', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const unitLabel = unit === 'metric' ? 'kg' : 'lb';

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
          <Text style={[styles.label, { color: c.text }]}>{t('primarySkill')}</Text>
          {['handstand', 'muscle-up', 'front-lever', 'planche', 'pistol'].map((skill) => (
            <Pressable
              key={skill}
              style={[styles.option, primarySkill === skill && { borderColor: c.primary }]}
              onPress={() => updatePrimarySkill(skill)}
            >
              <Text style={{ color: c.text, textTransform: 'capitalize' }}>{skill.replace('-', ' ')}</Text>
            </Pressable>
          ))}
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
          style={[styles.button, { backgroundColor: c.primary }, days.length !== 3 && styles.buttonDisabled]}
          onPress={save}
          disabled={days.length !== 3}
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
