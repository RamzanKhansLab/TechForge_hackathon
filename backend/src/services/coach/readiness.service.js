/**
 * services/coach/readiness.service.js
 * Pure functions – no DB calls, no side-effects.
 * All exported functions are unit-tested in test/coach.readiness.test.js
 */
import { ONTOLOGY_MAP, adjacency } from '../../ontology/ontology.service.js';

/** Effort tags from ontology difficulty (seconds of estimated work) */
const DIFFICULTY_HOURS = { beginner: 2, intermediate: 4, advanced: 8 };

/**
 * Build the readiness summary from a completed Analysis document.
 *
 * @param {object} analysis  – Mongoose doc (or plain object) with .skills[], .repositories[], .resume, .partialEvidence, .partialEvidenceReason, .rateLimitResetAt, .completedAt
 * @param {Array}  savedRoles – array of JobAnalysis plain objects tagged as target roles
 * @returns {object}
 */
export function buildReadiness(analysis, savedRoles = []) {
  const skills = analysis.skills ?? [];
  const repos = analysis.repositories ?? [];

  // ── counts ──────────────────────────────────────────────────────────────
  const claimed = skills.filter(s => s.claimed);
  const claimedCount = claimed.length;
  const provenCount = claimed.filter(s => s.verdict === 'Proven').length;
  const partialCount = claimed.filter(s => s.verdict === 'Partial').length;
  const claimedOnlyCount = claimed.filter(s => s.verdict === 'Claimed-only').length;

  const sentence = buildSentence(provenCount, claimedCount);

  // ── hidden strengths (proven/partial evidence, NOT claimed on resume) ────
  const claimedIds = new Set(claimed.map(s => s.id));
  const hiddenStrengths = skills
    .filter(s => !claimedIds.has(s.id) && (s.verdict === 'Proven' || s.verdict === 'Partial'))
    .map(s => ({
      skillId: s.id,
      label: s.label || s.name,
      repos: s.repositories ?? [],
      evidenceLinks: (s.evidence ?? []).map(e => e.url).filter(Boolean).slice(0, 3),
    }));

  // ── fastest win ──────────────────────────────────────────────────────────
  const fastestWin = computeFastestWin(claimed, skills, repos, savedRoles);

  // ── freshness ────────────────────────────────────────────────────────────
  const lastAnalyzedAt = analysis.completedAt ?? analysis.createdAt ?? null;
  const newestRepoPushAt = repos.reduce((best, r) => {
    const d = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    return d > best ? d : best;
  }, 0);
  const freshness = {
    lastAnalyzedAt: lastAnalyzedAt ?? null,
    newestRepoPushAt: newestRepoPushAt ? new Date(newestRepoPushAt).toISOString() : null,
    stale: newestRepoPushAt > 0 && lastAnalyzedAt
      ? newestRepoPushAt > new Date(lastAnalyzedAt).getTime()
      : false,
  };

  // ── partial evidence banner ──────────────────────────────────────────────
  const partialEvidence = {
    active: Boolean(analysis.partialEvidence),
    reason: analysis.partialEvidenceReason ?? null,
    resetAt: analysis.rateLimitResetAt ?? null,
  };

  return {
    claimedCount,
    provenCount,
    partialCount,
    claimedOnlyCount,
    sentence,
    fastestWin,
    hiddenStrengths,
    freshness,
    partialEvidence,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Human-readable readiness sentence.
 */
export function buildSentence(provenCount, claimedCount) {
  if (claimedCount === 0) return 'No skills were found on the resume.';
  if (provenCount === 0) return `None of your ${claimedCount} claimed skill${claimedCount === 1 ? '' : 's'} yet have code-level evidence.`;
  if (provenCount === claimedCount) return `All ${claimedCount} claimed skill${claimedCount === 1 ? '' : 's'} are proven by code.`;
  return `${provenCount} of ${claimedCount} claimed skill${claimedCount === 1 ? '' : 's'} ${provenCount === 1 ? 'is' : 'are'} proven by code.`;
}

/**
 * Impact of adding a skill = weighted sum of appearances in saved target roles
 * + a base score from the number of times it appears as claimed in the resume.
 * Importance weights: required = 1.0, preferred = 0.5.
 */
export function skillImpact(skillId, savedRoles) {
  let score = 0;
  for (const role of savedRoles) {
    for (const m of role.matches ?? []) {
      if (m.skill === skillId && m.state === 'Gap') {
        // required vs preferred is not stored per-match yet; default to 1.0
        score += 1.0;
      }
    }
    if ((role.requiredSkills ?? []).includes(skillId)) score += 1.0;
    else if ((role.preferredSkills ?? []).includes(skillId)) score += 0.5;
  }
  return Math.max(score, 0.1); // floor so unlinked skills still rank
}

/**
 * Effort of proving a skill = base difficulty hours reduced by adjacency to
 * already-proven skills. adjacency is 0..1; reduction is adjacency * 50%.
 *
 * effort_hours = difficulty_hours * (1 - max_adjacency * 0.5)
 */
export function skillEffortHours(skillId, provenSkillIds) {
  const meta = ONTOLOGY_MAP.get(skillId);
  const base = DIFFICULTY_HOURS[meta?.difficulty ?? 'intermediate'] ?? 4;
  const maxAdj = provenSkillIds.reduce((best, pid) => {
    const adj = adjacency(pid, skillId);
    return adj > best ? adj : best;
  }, 0);
  return Math.max(1, Math.round(base * (1 - maxAdj * 0.5)));
}

/**
 * Pick the fastest win: argmax over (non-proven claimed skills) of impact/effort.
 * Tie-break deterministically by skillId (alphabetical).
 */
export function computeFastestWin(claimedSkills, allSkills, repos, savedRoles) {
  const nonProven = claimedSkills.filter(s => s.verdict !== 'Proven');
  if (nonProven.length === 0) return null;

  const provenIds = claimedSkills.filter(s => s.verdict === 'Proven').map(s => s.id);

  let best = null;
  let bestRatio = -Infinity;

  for (const s of nonProven) {
    const impact = skillImpact(s.id, savedRoles);
    const effort = skillEffortHours(s.id, provenIds);
    const ratio = impact / effort;

    if (ratio > bestRatio || (ratio === bestRatio && (best === null || s.id < best.skillId))) {
      bestRatio = ratio;
      // Find a repo to extend: any repo with matching evidence that isn't the primary
      const repoWithEvidence = repos.find(r =>
        (r.evidence ?? []).some(e => (e.skillId ?? e.skill) === s.id)
      );
      best = {
        skillId: s.id,
        label: s.label || s.name,
        estimatedHours: effort,
        reason: buildWinReason(s, savedRoles, effort),
        repoToExtend: repoWithEvidence?.fullName ?? null,
      };
    }
  }

  return best;
}

function buildWinReason(skill, savedRoles, hours) {
  const roleNames = savedRoles
    .filter(r => (r.requiredSkills ?? []).includes(skill.id) || (r.preferredSkills ?? []).includes(skill.id))
    .map(r => r.title ?? 'a saved role');

  const roleClause = roleNames.length > 0
    ? `Required in ${roleNames.length} saved role${roleNames.length === 1 ? '' : 's'}.`
    : 'Claimed on your resume.';

  return `${roleClause} About ${hours} hour${hours === 1 ? '' : 's'} of focused work.`;
}
