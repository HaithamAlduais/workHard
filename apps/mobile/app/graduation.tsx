import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useGraduationStore } from '../stores/graduationStore';
import { useSkillStore } from '../stores/skillStore';
import { useEquipmentStore } from '../stores/equipmentStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useHomeReadiness, getPainFlaggedExerciseIds } from '../lib/readiness';
import {
  evaluateGraduation,
  createGraduationContract,
  getSkillNode,
  validateContractSelection,
  type GraduationTemplate,
  type GraduationRequirement
} from '@gravitypath/domain';

interface TemplateMeta {
  id: GraduationTemplate;
  label: string;
  difficulty: string;
  description: string;
  warning?: string;
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: 'PRACTICAL_HOME_INDEPENDENCE',
    label: 'Practical Home Independence',
    difficulty: 'Intermediate',
    description:
      'Build a complete home-friendly training base. Requires all movement patterns to be home-ready and six foundational weighted-calisthenics skills to be unlocked.'
  },
  {
    id: 'ADVANCED_CALISTHENICS_GRADUATION',
    label: 'Advanced Calisthenics',
    difficulty: 'Advanced',
    description:
      'Move beyond the gym with freestanding skills, muscle-ups, and front-lever work. Requires all movement patterns plus eight advanced skill unlocks.'
  },
  {
    id: 'ELITE_MASTERY',
    label: 'Elite Mastery',
    difficulty: 'Expert',
    description:
      'Master the highest weighted and static skills. Requires every movement pattern and nine elite skills to be mastered.',
    warning: 'Elite Mastery demands video-verified, coach-confirmed attempts and a long training history.'
  }
];

function formatRequirement(req: GraduationRequirement): string {
  if (req.targetSkillNodeId) {
    const node = getSkillNode(req.targetSkillNodeId);
    const name = node?.name ?? req.targetSkillNodeId;
    return `${req.type.replace(/_/g, ' ')} — ${name}`;
  }
  if (req.targetMovementPattern) {
    return `${req.targetMovementPattern.replace(/_/g, ' ')}`;
  }
  return req.type.replace(/_/g, ' ');
}

function requirementPreview(template: GraduationTemplate): string[] {
  switch (template) {
    case 'PRACTICAL_HOME_INDEPENDENCE':
      return ['All 12 movement patterns home-ready', '6 foundational weighted-calisthenics skills unlocked'];
    case 'ADVANCED_CALISTHENICS_GRADUATION':
      return ['Practical Home Independence completed', 'All 12 movement patterns home-ready', '8 advanced skills unlocked'];
    case 'ELITE_MASTERY':
      return ['Advanced Calisthenics completed', 'All 12 movement patterns home-ready', '9 elite skills mastered'];
    default:
      return [];
  }
}

export default function GraduationScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useI18n();
  const graduation = useGraduationStore();
  const { getUnlockStates } = useSkillStore();
  const equipment = useEquipmentStore();
  const { completedWorkouts, sets } = useWorkoutStore();
  const { readiness } = useHomeReadiness();

  const contract = graduation.contract;
  const unlockStates = getUnlockStates();

  const decision = contract ? evaluateGraduation(contract, unlockStates, readiness) : null;

  const canImmediateTransition =
    !!decision?.complete &&
    equipment.getOwnedList().length > 0 &&
    getPainFlaggedExerciseIds(completedWorkouts, sets).length === 0;

  const startNewContract = (template: GraduationTemplate) => {
    const validation = validateContractSelection(template, {
      completedTemplates: graduation.completedTemplates
    });
    if (!validation.valid) {
      Alert.alert('Contract not available', validation.reason ?? 'This contract cannot be selected right now.');
      return;
    }
    graduation.selectTemplate(template);
    graduation.setContract(createGraduationContract(template, 'local'));
  };

  const remainingBlockers = decision?.remainingRequirements
    .filter((r) => r.type === 'MOVEMENT_PATTERN_READY')
    .map((r) => r.targetMovementPattern)
    .filter(Boolean) as string[] | undefined;

  const skillBlockers = decision?.remainingRequirements
    .filter((r) => r.type === 'SKILL_UNLOCKED' || r.type === 'SKILL_MASTERED')
    .map(formatRequirement);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>Graduation</Text>

        {!contract && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Select a Contract</Text>
            {TEMPLATES.map((template) => {
              const validation = validateContractSelection(template.id, {
                completedTemplates: graduation.completedTemplates
              });
              const locked = !validation.valid;
              return (
                <View
                  key={template.id}
                  testID={`contract-card-${template.id}`}
                  style={[styles.templateCard, { borderColor: c.border, opacity: locked ? 0.75 : 1 }]}
                >
                  <View style={styles.templateHeader}>
                    <Text style={[styles.templateLabel, { color: c.text }]}>{template.label}</Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: c.surfaceHighlight }]}>
                      <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>
                        {template.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 14, marginBottom: 8 }}>
                    {template.description}
                  </Text>
                  {template.warning && (
                    <Text style={{ color: c.warning, fontSize: 13, marginBottom: 8 }}>
                      ⚠ {template.warning}
                    </Text>
                  )}
                  <View style={{ marginBottom: 8 }}>
                    {requirementPreview(template.id).map((line, idx) => (
                      <Text key={idx} style={{ color: c.text, fontSize: 13, marginBottom: 2 }}>
                        • {line}
                      </Text>
                    ))}
                  </View>
                  {locked && (
                    <Text
                      testID={`lock-reason-${template.id}`}
                      style={{ color: c.warning, fontSize: 13, fontWeight: '600', marginBottom: 8 }}
                    >
                      🔒 {validation.reason}
                    </Text>
                  )}
                  <Pressable
                    testID={`select-contract-${template.id}`}
                    style={[
                      styles.smallButton,
                      { backgroundColor: locked ? c.border : c.primary }
                    ]}
                    onPress={() => {
                      if (locked) {
                        Alert.alert('Contract locked', validation.reason ?? 'Prerequisites not met.');
                        return;
                      }
                      startNewContract(template.id);
                    }}
                  >
                    <Text style={styles.smallButtonText}>{locked ? 'Locked' : 'Select'}</Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={[styles.templateCard, { borderColor: c.border, opacity: 0.7 }]}>
              <Text style={[styles.templateLabel, { color: c.text }]}>Custom Contract</Text>
              <Text style={{ color: c.textMuted, fontSize: 14 }}>
                Full customization is not implemented yet. Choose a template above to continue.
              </Text>
            </View>
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
                  {Object.entries(decision.fourWeekTransition).map(([week, split]) => (
                    <Text key={week} style={{ color: c.textMuted, marginBottom: 4 }}>
                      {week.replace('week', 'Week ')}: {split.gymPercent}% gym / {split.homePercent}% home
                    </Text>
                  ))}
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

              {decision.complete && !graduation.completedTemplates.includes(contract.template) && (
                <Pressable
                  testID="mark-contract-complete"
                  style={[styles.button, { backgroundColor: c.primary, marginTop: 12 }]}
                  onPress={() => graduation.markTemplateCompleted(contract.template)}
                >
                  <Text style={styles.buttonText}>Mark Contract Complete</Text>
                </Pressable>
              )}

              <Pressable
                testID="change-contract"
                style={[styles.button, { backgroundColor: c.warning, marginTop: 12 }]}
                onPress={() => graduation.resetGraduation()}
              >
                <Text style={styles.buttonText}>Change Contract</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Estimated Blockers</Text>
              {remainingBlockers && remainingBlockers.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.label, { color: c.text }]}>Movement Patterns</Text>
                  {remainingBlockers.map((pattern) => (
                    <Text key={pattern} style={{ color: c.warning, marginBottom: 4 }}>
                      • {pattern.replace(/_/g, ' ')}
                    </Text>
                  ))}
                </View>
              )}
              {skillBlockers && skillBlockers.length > 0 && (
                <View>
                  <Text style={[styles.label, { color: c.text }]}>Skills</Text>
                  {skillBlockers.slice(0, 8).map((name, idx) => (
                    <Text key={idx} style={{ color: c.textMuted, marginBottom: 4 }}>
                      • {name}
                    </Text>
                  ))}
                </View>
              )}
              {(!remainingBlockers || remainingBlockers.length === 0) &&
                (!skillBlockers || skillBlockers.length === 0) && (
                  <Text style={{ color: c.success }}>No blockers — contract is complete.</Text>
                )}
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Remaining Requirements</Text>
              {decision.remainingRequirements.length === 0 ? (
                <Text style={{ color: c.textMuted }}>All requirements satisfied.</Text>
              ) : (
                decision.remainingRequirements.slice(0, 12).map((req, idx) => (
                  <Text key={idx} style={{ color: c.text, marginBottom: 6 }}>
                    • {formatRequirement(req)}
                  </Text>
                ))
              )}
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Satisfied Requirements</Text>
              {decision.satisfiedRequirements.length === 0 ? (
                <Text style={{ color: c.textMuted }}>No requirements satisfied yet.</Text>
              ) : (
                decision.satisfiedRequirements.slice(0, 12).map((req, idx) => (
                  <Text key={idx} style={{ color: c.success, marginBottom: 6 }}>
                    ✓ {formatRequirement(req)}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  successBox: { padding: 12, borderRadius: 12, marginTop: 12 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  templateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  templateLabel: { fontSize: 16, fontWeight: '700' },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  smallButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  smallButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
