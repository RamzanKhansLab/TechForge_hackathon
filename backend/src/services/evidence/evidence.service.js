import { SKILL_MAP } from '../../data/skills.js';
import { scoreSkillV2 } from './scoring.v2.js';
import { expand } from '../../ontology/ontology.service.js';

export function verifySkills(claimedSkills = [], repositories = [], externalPRs = [], detailedClaims = []) {
  // Collect all raw evidence from repos
  const rawEvidence = repositories.flatMap(r => r.evidence || []);

  // 1. Gather all direct evidenced skill IDs
  const directSkillIds = new Set(rawEvidence.map(e => e.skillId || e.skill).filter(Boolean));

  // 2. Add transitive implied evidence with decay (e.g. nextjs -> react: 0.5, javascript: 0.35)
  const impliedEvidence = [];
  for (const skillId of directSkillIds) {
    const expansions = expand(skillId);
    for (const exp of expansions) {
      // Find parent evidence item
      const parentEv = rawEvidence.find(e => (e.skillId || e.skill) === skillId);
      if (parentEv) {
        impliedEvidence.push({
          ...parentEv,
          skillId: exp.id,
          skill: exp.id,
          weight: Math.round((parentEv.weight || 1.0) * exp.weight * 100) / 100,
          implied: true,
          impliedBy: skillId,
          note: `Inferred from ${skillId} evidence (${exp.weight} weight)`
        });
      }
    }
  }

  const allEvidence = [...rawEvidence, ...impliedEvidence];
  const allSkillIds = [...new Set([...claimedSkills, ...directSkillIds, ...impliedEvidence.map(e => e.skillId)])];

  const claimedMap = new Map((detailedClaims || []).map(c => [c.id, c]));

  return allSkillIds.filter(id => SKILL_MAP[id]).map(id => {
    const evidenceForSkill = allEvidence.filter(e => (e.skillId || e.skill) === id);
    const claim = claimedMap.get(id) || null;
    const isClaimed = claimedSkills.includes(id);

    const scored = scoreSkillV2(id, evidenceForSkill, repositories, externalPRs, claim);

    const impliedByList = [...new Set(evidenceForSkill.filter(e => e.implied && e.impliedBy).map(e => e.impliedBy))];

    return {
      ...scored,
      claimed: isClaimed ? {
        source: 'resume',
        mentions: claim?.mentions || 1,
        contexts: claim?.contexts || [],
        claimedYears: claim?.claimedYears || null,
        claimedSince: claim?.claimedSince || null
      } : false,
      impliedBy: impliedByList,
      reasons: [
        scored.verdict === 'Proven'
          ? 'Direct repository signals and code-level evidence meet the verification threshold.'
          : scored.verdict === 'Partial'
            ? 'Code evidence exists, but supporting signals or recency are limited.'
            : 'No sufficient code-level evidence was found in public repositories.',
        ...scored.breakdownList.map(item => `${item.rule}: +${item.points} (${item.description})`)
      ]
    };
  }).sort((a, b) => Number(Boolean(b.claimed)) - Number(Boolean(a.claimed)) || b.score - a.score || a.label.localeCompare(b.label));
}
