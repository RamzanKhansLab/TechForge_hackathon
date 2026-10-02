import { SCORING } from '../../config/scoring.js';
export function classifyEvidence(score, hasDirect) {
  if (hasDirect && score >= SCORING.thresholds.proven) return 'Proven';
  if (score >= SCORING.thresholds.partial) return 'Partial';
  return 'Claimed-only';
}
