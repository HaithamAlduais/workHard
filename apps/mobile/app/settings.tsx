import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n, Locale } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useScheduleStore } from '../stores/scheduleStore';

export default function SettingsScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, locale, setLocale, isRTL } = useI18n();
  const { user } = useAuth();
  const { trainingDays, setTrainingDays } = useScheduleStore();
  const [selectedDays, setSelectedDays] = useState<number[]>(trainingDays);

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
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
