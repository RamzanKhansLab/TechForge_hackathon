import { SCORING } from '../../config/scoring.js';
import { SKILL_MAP } from '../../data/skills.js';
import { microTaskFor } from '../../data/microTasks.js';
export function matchSkills(requiredSkills, candidateSkills) {
  const byId = new Map(candidateSkills.map(skill => [skill.id,skill]));
  const matches = requiredSkills.map(id => {
    const candidate = byId.get(id);
    const state = candidate?.status === 'Proven' ? 'Verified' : candidate?.status === 'Partial' ? 'Partial' : 'Gap';
    return { skill: id, name: SKILL_MAP[id].name, candidateStatus: candidate?.status || 'Missing', score: candidate?.score || 0, state,
      evidence: candidate?.evidence || [], reason: state === 'Verified' ? 'Public evidence meets the verification threshold.' : state === 'Partial' ? 'Some public evidence exists; more supporting evidence would strengthen coverage.' : candidate ? 'The resume claims this skill, but inspected evidence is below the threshold.' : 'This skill was not found in the resume or direct repository evidence.' };
  });
  const coverage = requiredSkills.length ? Math.round(matches.reduce((sum,m) => sum + (SCORING.coverage[m.candidateStatus] || 0),0) / requiredSkills.length * 100) : null;
  return { matches, coverage, summary: { verified: matches.filter(m => m.state === 'Verified').length, partial: matches.filter(m => m.state === 'Partial').length, gaps: matches.filter(m => m.state === 'Gap').length, required: requiredSkills.length }, microTasks: matches.filter(m => m.state !== 'Verified').map(m => microTaskFor(m.skill)) };
}
