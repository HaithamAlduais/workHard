import type { SkillNode, SkillAttempt, SkillUnlockState } from '../types.js';

export function evaluateSkillUnlock(
  node: SkillNode,
  prerequisiteStates: SkillUnlockState[],
  recentAttempts: SkillAttempt[]
): SkillUnlockState {
  if (node.unlockRule.expertLocked) {
    const verified = recentAttempts.some((a) => a.coachVerified || a.videoVerified);
    if (!verified) {
      return {
        nodeId: node.id,
        status: 'locked',
        reason: 'Expert-locked node requires coach or verified-video approval.'
      };
    }
  }

  const missingPrereqs = prerequisiteStates.filter(
    (p) => node.prerequisites.includes(p.nodeId) && p.status !== 'unlocked' && p.status !== 'mastered'
  );

  if (missingPrereqs.length > 0) {
    return {
      nodeId: node.id,
      status: 'locked',
      reason: `Prerequisites not met: ${missingPrereqs.map((p) => p.nodeId).join(', ')}`
    };
  }

  if (recentAttempts.some((a) => a.painLevel >= 2)) {
    return {
      nodeId: node.id,
      status: 'safety_hold',
      reason: 'Pain reported. Node held for safety.'
    };
  }

  const qualityAttempts = recentAttempts.filter(
    (a) => a.qualityScore >= node.targetQuality && a.painLevel === 0 && a.fullRom
  );

  if (qualityAttempts.length >= node.unlockRule.requiredSuccessfulExposures) {
    const mastered = qualityAttempts.length >= node.unlockRule.requiredSuccessfulExposures * 2;
    return {
      nodeId: node.id,
      status: mastered ? 'mastered' : 'unlocked',
      reason: mastered
        ? `Mastered: ${qualityAttempts.length} quality exposures meeting target.`
        : `Unlocked: ${qualityAttempts.length} quality exposures meeting target.`
    };
  }

  if (prerequisiteStates.every((p) => node.prerequisites.length === 0 || p.status === 'unlocked' || p.status === 'mastered')) {
    return {
      nodeId: node.id,
      status: 'available',
      reason: 'Prerequisites satisfied. Node available for practice.'
    };
  }

  return {
    nodeId: node.id,
    status: 'locked',
    reason: 'Prerequisites not satisfied.'
  };
}

export function buildUnlockGraph(
  nodes: SkillNode[],
  attemptsByNode: Map<string, SkillAttempt[]>
): Map<string, SkillUnlockState> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const states = new Map<string, SkillUnlockState>();

  const evaluate = (nodeId: string): SkillUnlockState => {
    if (states.has(nodeId)) return states.get(nodeId)!;
    const node = byId.get(nodeId);
    if (!node) return { nodeId, status: 'locked', reason: 'Unknown node' };

    const prereqStates = node.prerequisites.map(evaluate);
    const attempts = attemptsByNode.get(nodeId) ?? [];
    const state = evaluateSkillUnlock(node, prereqStates, attempts);
    states.set(nodeId, state);
    return state;
  };

  for (const node of nodes) {
    evaluate(node.id);
  }

  return states;
}
