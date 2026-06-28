// @ts-nocheck
(globalThis as any).window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

import { describe, it, expect, beforeEach } from 'vitest';
import { useGraduationStore } from '../stores/graduationStore';
import { createGraduationContract } from '@gravitypath/domain';

function resetStore() {
  useGraduationStore.setState({
    selectedTemplate: null,
    customRequirements: [],
    contract: null,
    homeIndependenceMode: false,
    transitionWeek: 0,
    completedTemplates: []
  });
}

describe('graduationStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('selects and persists the Practical Home contract', () => {
    const template = 'PRACTICAL_HOME_INDEPENDENCE';
    useGraduationStore.getState().selectTemplate(template);
    useGraduationStore.getState().setContract(createGraduationContract(template, 'local'));
    const state = useGraduationStore.getState();
    expect(state.selectedTemplate).toBe(template);
    expect(state.contract).not.toBeNull();
    expect(state.contract?.template).toBe(template);
  });

  it('selects and persists the Advanced Calisthenics contract', () => {
    const template = 'ADVANCED_CALISTHENICS_GRADUATION';
    useGraduationStore.getState().selectTemplate(template);
    useGraduationStore.getState().setContract(createGraduationContract(template, 'local'));
    const state = useGraduationStore.getState();
    expect(state.selectedTemplate).toBe(template);
    expect(state.contract?.template).toBe(template);
    expect(state.contract?.requirements.some((r) => r.targetSkillNodeId === 'freestanding-handstand')).toBe(true);
  });

  it('selects and persists the Elite Mastery contract', () => {
    const template = 'ELITE_MASTERY';
    useGraduationStore.getState().selectTemplate(template);
    useGraduationStore.getState().setContract(createGraduationContract(template, 'local'));
    const state = useGraduationStore.getState();
    expect(state.selectedTemplate).toBe(template);
    expect(state.contract?.template).toBe(template);
    expect(state.contract?.requirements.some((r) => r.type === 'SKILL_MASTERED')).toBe(true);
  });

  it('activates home independence mode', () => {
    useGraduationStore.getState().selectTemplate('PRACTICAL_HOME_INDEPENDENCE');
    useGraduationStore.getState().setContract(createGraduationContract('PRACTICAL_HOME_INDEPENDENCE', 'local'));
    useGraduationStore.getState().activateHomeIndependence();
    const state = useGraduationStore.getState();
    expect(state.homeIndependenceMode).toBe(true);
    expect(state.transitionWeek).toBe(4);
  });

  it('records completed templates when activating home independence', () => {
    useGraduationStore.getState().selectTemplate('PRACTICAL_HOME_INDEPENDENCE');
    useGraduationStore.getState().setContract(createGraduationContract('PRACTICAL_HOME_INDEPENDENCE', 'local'));
    useGraduationStore.getState().activateHomeIndependence();
    const state = useGraduationStore.getState();
    expect(state.completedTemplates).toContain('PRACTICAL_HOME_INDEPENDENCE');
  });

  it('records completed templates via markTemplateCompleted', () => {
    useGraduationStore.getState().markTemplateCompleted('ADVANCED_CALISTHENICS_GRADUATION');
    expect(useGraduationStore.getState().completedTemplates).toContain('ADVANCED_CALISTHENICS_GRADUATION');
  });

  it('reset clears contract state', () => {
    useGraduationStore.getState().selectTemplate('PRACTICAL_HOME_INDEPENDENCE');
    useGraduationStore.getState().setContract(createGraduationContract('PRACTICAL_HOME_INDEPENDENCE', 'local'));
    useGraduationStore.getState().activateHomeIndependence();
    useGraduationStore.getState().resetGraduation();
    const state = useGraduationStore.getState();
    expect(state.contract).toBeNull();
    expect(state.selectedTemplate).toBeNull();
    expect(state.homeIndependenceMode).toBe(false);
    expect(state.completedTemplates).toEqual([]);
  });
});
