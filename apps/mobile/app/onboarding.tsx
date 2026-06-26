import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useScheduleStore } from '../stores/scheduleStore';

export default function Onboarding() {
  const router = useRouter();
  const c = useColors();
  const { t, isRTL, setLocale, locale } = useI18n();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [primarySkill, setPrimarySkill] = useState('handstand');
  const { setTrainingDays } = useScheduleStore();

  const toggleDay = (d: number) => {
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 3) return prev;
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const save = () => {
    setTrainingDays(days);
    router.back();
  };

  const dayNames = isRTL
    ? ['أحد', 'إثن', 'ثلاث', 'أرب', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
              onPress={() => setPrimarySkill(skill)}
            >
              <Text style={{ color: c.text, textTransform: 'capitalize' }}>{skill.replace('-', ' ')}</Text>
            </Pressable>
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
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
