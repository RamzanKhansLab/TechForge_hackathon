import { SCORING } from '../../config/scoring.js';
export function scoreEvidence(evidence) {
  const direct = evidence.filter(e => e.strength === 'direct');
  const directRepositories = [...new Set(direct.map(e => e.repository))];
  const breakdown = [];
  const base = Math.max(0, ...direct.map(e => SCORING.weights[e.type] || 0));
  if (base) breakdown.push({ rule: 'Strongest direct signal', points: base });
  if (directRepositories.length > 1) breakdown.push({ rule: 'Direct signals in multiple repositories', points: SCORING.weights.multipleRepositories });
  if (evidence.some(e => e.type === 'readme')) breakdown.push({ rule: 'README mention', points: SCORING.weights.readme });
  if (direct.length) for (const [type, label] of [['commitActivity','Candidate-authored repository commits'],['recentActivity','Repository contribution in the last 90 days'],['testing','Repository test-path indicators'],['deployment','Repository deployment configuration']]) {
    if (evidence.some(e => e.type === type && directRepositories.includes(e.repository))) breakdown.push({ rule: label, points: SCORING.weights[type] });
  }
  return { score: Math.min(100, breakdown.reduce((sum,item) => sum + item.points, 0)), breakdown, hasDirect: direct.length > 0 };
}
