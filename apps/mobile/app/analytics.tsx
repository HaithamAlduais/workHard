import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';

export default function AnalyticsScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>{t('analytics')}</Text>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Weighted Pull-up Progress</Text>
          <Text style={{ color: c.textMuted }}>Current: 15 kg × 5,5,4 reps</Text>
          <Text style={{ color: c.textMuted }}>Relative load: 18.8% bodyweight</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Handstand Hold</Text>
          <Text style={{ color: c.textMuted }}>Best: 35 s chest-to-wall</Text>
          <Text style={{ color: c.textMuted }}>Freestanding success: 40%</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Weekly Volume</Text>
          <Text style={{ color: c.textMuted }}>Chest: 12 direct sets</Text>
          <Text style={{ color: c.textMuted }}>Back: 14 direct sets</Text>
          <Text style={{ color: c.textMuted }}>Legs: 10 direct sets</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Adherence</Text>
          <Text style={{ color: c.textMuted }}>Last 4 weeks: 92%</Text>
          <Text style={{ color: c.textMuted }}>Average session: 56 min</Text>
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
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
