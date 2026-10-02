import { SKILL_MAP } from '../../data/skills.js';
import { normalizeEvidence } from './evidence.normalizer.js';
import { scoreEvidence } from './evidence.scorer.js';
import { classifyEvidence } from './evidence.classifier.js';
export function verifySkills(claimedSkills, repositories) {
  const all = normalizeEvidence(repositories);
  const ids = [...new Set([...claimedSkills, ...all.filter(e => e.strength === 'direct').map(e => e.skill)])];
  return ids.filter(id => SKILL_MAP[id]).map(id => {
    const evidence = all.filter(e => e.skill === id);
    const { score, breakdown, hasDirect } = scoreEvidence(evidence);
    const status = classifyEvidence(score, hasDirect);
    return { id, name: SKILL_MAP[id].name, category: SKILL_MAP[id].category, claimed: claimedSkills.includes(id), status, score,
      evidence, repositories: [...new Set(evidence.map(e => e.repository))], breakdown,
      reasons: [status === 'Proven' ? 'Direct repository signals meet the configured evidence threshold.' : status === 'Partial' ? 'Direct evidence exists, but the supporting signals are limited.' : 'No sufficiently strong evidence was found in the inspected public repositories.', ...breakdown.map(item => `${item.rule}: +${item.points}`)],
    };
  }).sort((a,b) => Number(b.claimed) - Number(a.claimed) || b.score - a.score || a.name.localeCompare(b.name));
}
