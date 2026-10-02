/**
 * services/coach/roleCompare.service.js
 * Aggregate multiple JobAnalysis docs (target roles) into a comparison object
 * and compute the shared-gaps list.
 * Pure function – no DB calls.
 */
import { ONTOLOGY_MAP } from '../../ontology/ontology.service.js';

/**
 * @param {Array} savedRoles   array of JobAnalysis plain objects
 * @param {Array} candidateSkills  analysis.skills[]
 * @returns {object}  { roles[], sharedGaps[] }
 */
export function buildRoleCompare(savedRoles, candidateSkills = []) {
  if (!savedRoles || savedRoles.length === 0) {
    return { roles: [], sharedGaps: [] };
  }

  const skillById = new Map(candidateSkills.map(s => [s.id, s]));

  // ── per-role summary ──────────────────────────────────────────────────────
  // gapCount tracks how many roles each skill is missing in
  const gapCountMap = new Map(); // skillId -> number of roles it is a gap in

  const roles = savedRoles.map(role => {
    const matches = role.matches ?? [];
    let verified = 0, partial = 0, adjacent = 0, gaps = 0;
    const topGapIds = [];

    for (const m of matches) {
      switch (m.state) {
        case 'Verified': verified++; break;
        case 'Partial':  partial++;  break;
        case 'Gap': {
          gaps++;
          topGapIds.push(m.skill);
          gapCountMap.set(m.skill, (gapCountMap.get(m.skill) ?? 0) + 1);
          break;
        }
        default: {
          // Skills not in candidate profile at all
          if (!skillById.has(m.skill)) {
            adjacent++;
          }
        }
      }
    }

    // Adjacent: skills with indirect evidence (adjacency from proven skills)
    // – already partially counted above; ensure no double-count with gap list
    const topGaps = topGapIds.slice(0, 3);
    const coverage = role.coverage ?? null;

    return {
      jobId: String(role._id),
      roleTitle: role.title ?? 'Untitled role',
      coverage,
      verified,
      partial,
      adjacent,
      gaps,
      topGaps,
    };
  });

  // ── shared gaps: skills missing in 2+ roles ───────────────────────────────
  const sharedGaps = [];
  for (const [skillId, count] of gapCountMap) {
    if (count >= 2) {
      const ont = ONTOLOGY_MAP.get(skillId);
      sharedGaps.push({
        skillId,
        label: ont?.label ?? skillId,
        missingInRoles: count,
        taskId: skillId, // micro-task IDs match skill IDs
      });
    }
  }

  // Order shared gaps by how many roles need it (desc), then alphabetically
  sharedGaps.sort((a, b) => b.missingInRoles - a.missingInRoles || a.skillId.localeCompare(b.skillId));

  return { roles, sharedGaps };
}
