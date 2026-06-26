import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

const MESSAGES = [
  {
    title: 'Weighted Pull-up',
    body: 'Your weighted pull-up remains at 15 kg because you completed 6, 6, and 5 repetitions. The rule requires 6, 6, and 6 with acceptable form before increasing load. Your next target is 6, 6, and 6 at 15 kg.'
  },
  {
    title: 'Front Lever',
    body: 'You have not unlocked full front lever because your advanced-tuck holds reached the time target only once. The node requires the target on two of three exposures with acceptable body-line quality.'
  },
  {
    title: 'Home Readiness',
    body: 'You are home-ready for vertical pulling but not yet for hamstring knee-flexion. You still need a Nordic or ring-curl progression that can provide sufficient loading.'
  }
];

export default function CoachScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('coach')}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Deterministic recommendations, explained in plain language.</Text>

        {MESSAGES.map((m, idx) => (
          <View key={idx} style={[styles.message, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.messageTitle, { color: c.primary }]}>{m.title}</Text>
            <Text style={[styles.messageBody, { color: c.text }]}>{m.body}</Text>
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
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  message: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  messageTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  messageBody: { fontSize: 15, lineHeight: 22 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
