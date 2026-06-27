import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useGraduationStore } from '../stores/graduationStore';
import { useSkillStore } from '../stores/skillStore';
import { useEquipmentStore } from '../stores/equipmentStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useHomeReadiness, getPainFlaggedExerciseIds } from '../lib/readiness';
import { evaluateGraduation, createGraduationContract, SKILL_FAMILIES } from '@gravitypath/domain';

export default function GraduationScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();
  const graduation = useGraduationStore();
  const { attempts, getUnlockStates } = useSkillStore();
  const equipment = useEquipmentStore();
  const { completedWorkouts, sets } = useWorkoutStore();
  const { readiness, percent } = useHomeReadiness();

  const contract = graduation.contract;
  const unlockStates = getUnlockStates();

  const decision = contract
    ? evaluateGraduation(contract, unlockStates, readiness)
    : null;

  const canImmediateTransition =
    !!decision?.complete &&
    equipment.getOwnedList().length > 0 &&
    getPainFlaggedExerciseIds(completedWorkouts, sets).length === 0;

  const startNewContract = (template: 'PRACTICAL_HOME_INDEPENDENCE') => {
    graduation.selectTemplate(template);
    graduation.setContract(createGraduationContract(template, 'local'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>Graduation</Text>

        {!contract && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Select a Contract</Text>
            <Pressable
              testID="start-practical-contract"
              style={[styles.button, { backgroundColor: c.primary }]}
              onPress={() => startNewContract('PRACTICAL_HOME_INDEPENDENCE')}
            >
              <Text style={styles.buttonText}>Start Practical Home Contract</Text>
            </Pressable>
          </View>
        )}

        {contract && decision && (
          <>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>
                {contract.template.replace(/_/g, ' ')}
              </Text>
              <Text style={[styles.cardBody, { color: c.text }]}>{decision.progressPercent}% complete</Text>
              <Text style={{ color: c.textMuted, marginTop: 8 }}>{decision.reason}</Text>

              {decision.complete && (
                <View style={[styles.successBox, { backgroundColor: c.surfaceHighlight }]}>
                  <Text style={{ color: c.success, fontWeight: '700' }}>Contract complete 🎉</Text>
                </View>
              )}

              {decision.complete && decision.fourWeekTransition && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: c.text }]}>Four-Week Transition</Text>
                  <Text style={{ color: c.textMuted }}>
                    Week 1: {decision.fourWeekTransition.week1.gymPercent}% gym /{' '}
                    {decision.fourWeekTransition.week1.homePercent}% home
                  </Text>
                  <Text style={{ color: c.textMuted }}>
                    Week 4: {decision.fourWeekTransition.week4.gymPercent}% gym /{' '}
                    {decision.fourWeekTransition.week4.homePercent}% home
                  </Text>
                </View>
              )}

              {canImmediateTransition && !graduation.homeIndependenceMode && (
                <Pressable
                  testID="activate-home-independence"
                  style={[styles.button, { backgroundColor: c.success, marginTop: 12 }]}
                  onPress={() => graduation.activateHomeIndependence()}
                >
                  <Text style={styles.buttonText}>Activate Home Independence Now</Text>
                </Pressable>
              )}

              {graduation.homeIndependenceMode && (
                <Text style={{ color: c.success, marginTop: 12, fontWeight: '700' }}>
                  Home Independence Mode Active
                </Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Remaining Requirements</Text>
              {decision.remainingRequirements.length === 0 ? (
                <Text style={{ color: c.textMuted }}>All requirements satisfied.</Text>
              ) : (
                decision.remainingRequirements.slice(0, 8).map((req, idx) => (
                  <Text key={idx} style={{ color: c.text, marginBottom: 6 }}>
                    • {req.type.replace(/_/g, ' ')}
                    {req.targetSkillNodeId
                      ? ` — ${getSkillNodeName(req.targetSkillNodeId)}`
                      : req.targetMovementPattern
                        ? ` — ${req.targetMovementPattern.replace(/_/g, ' ')}`
                        : ''}
                  </Text>
                ))
              )}
            </View>
          </>
        )}

        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonText}>{t('back') ?? 'Back'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getSkillNodeName(nodeId: string): string {
  const family = SKILL_FAMILIES.find((f) =>
    ['handstand', 'pull-up', 'ring-push-up', 'pistol', 'front-lever', 'back-lever', 'planche', 'l-sit', 'muscle-up', 'knee-flexion'].includes(f.id)
  );
  // Simple fallback; the UI does not need perfect labels for every node.
  return nodeId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  successBox: { padding: 12, borderRadius: 12, marginTop: 12 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
