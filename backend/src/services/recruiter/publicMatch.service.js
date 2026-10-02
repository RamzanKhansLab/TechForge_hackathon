/**
 * services/recruiter/publicMatch.service.js
 *
 * Stateless matching and multi-candidate comparison over public share tokens.
 * Guardrails:
 * - NO ranking, NO winner, NO best candidate flags
 * - Preserves candidate input order strictly
 * - Deterministic, stateless: never saves matches to DB
 * - Returns structured consentNote and full requirement breakdown
 */
import { extractJobSkills } from '../jobs/jobExtractor.js';
import { ONTOLOGY_MAP, adjacency } from '../../ontology/ontology.service.js';
import { verifyInstruction } from './verify.service.js';

const CONSENT_NOTE_SINGLE = 'Shared by the candidate. Evidence from public GitHub data. Not a hiring recommendation.';
const CONSENT_NOTE_COMPARE = 'Candidates shown in the order you added them. SkillProof does not rank people. Shared by each candidate. Evidence from public GitHub data. Not a hiring recommendation.';

/**
 * Builds stateless match for a single public analysis document against a JD text.
 *
 * @param {object} analysis - Public analysis document (must be public + completed)
 * @param {string} jdText - Job description text
 * @param {string} [roleTitle] - Optional role title override
 * @returns {object} Match result according to S5 JSON spec
 */
export function buildPublicMatch(analysis, jdText = '', roleTitle = null) {
  const extracted = extractJobSkills(jdText || '');
  const requiredList = extracted.requiredSkills || [];
  const preferredList = extracted.preferredSkills || [];

  // All extracted skills from JD
  const allJdSkills = [
    ...requiredList.map(id => ({ id, importance: 'required' })),
    ...preferredList.map(id => ({ id, importance: 'preferred' }))
  ];

  const candidateSkills = analysis.skills || [];
  const candidateSkillMap = new Map(candidateSkills.map(s => [s.id, s]));

  let verifiedCount = 0;
  let partialCount = 0;
  let gapCount = 0;

  const requirements = allJdSkills.map(({ id, importance }) => {
    const skillData = candidateSkillMap.get(id);
    const ontologyInfo = ONTOLOGY_MAP.get(id) || {};
    const label = skillData?.label || skillData?.name || ontologyInfo.label || id;

    let verdict = 'Missing';
    let credit = 0;
    let adjacentFrom = null;

    if (skillData) {
      if (skillData.verdict === 'Proven' || skillData.status === 'Proven') {
        verdict = 'Proven';
        credit = 1;
        verifiedCount++;
      } else if (skillData.verdict === 'Partial' || skillData.status === 'Partial') {
        verdict = 'Partial';
        credit = 0.5;
        partialCount++;
      } else if (skillData.verdict === 'Claimed-only' || skillData.status === 'Claimed-only') {
        verdict = 'Claimed-only';
        credit = 0;
        gapCount++;
      } else {
        verdict = 'Missing';
        credit = 0;
        gapCount++;
      }
    } else {
      // Check adjacency to any proven skill
      let bestAdj = 0;
      let bestFrom = null;
      for (const cs of candidateSkills) {
        if (cs.verdict === 'Proven' || cs.status === 'Proven') {
          const dist = adjacency(id, cs.id);
          if (dist > bestAdj) {
            bestAdj = dist;
            bestFrom = cs.label || cs.name || cs.id;
          }
        }
      }

      if (bestAdj >= 0.5) {
        verdict = 'Adjacent';
        credit = 0.25;
        adjacentFrom = bestFrom;
      } else {
        verdict = 'Missing';
        credit = 0;
      }
      gapCount++;
    }

    const evidenceItems = (skillData?.evidence || []).map(e => ({
      url: e.url,
      repo: e.repo || e.repository,
      path: e.path || e.file,
      kind: e.kind || e.type,
      verifyHow: verifyInstruction(e)
    }));

    let explanation = '';
    if (verdict === 'Proven') {
      explanation = `Proven with ${evidenceItems.length} code-level evidence artifact${evidenceItems.length === 1 ? '' : 's'}.`;
    } else if (verdict === 'Partial') {
      explanation = 'Partial code evidence found; does not meet the full proven threshold.';
    } else if (verdict === 'Claimed-only') {
      explanation = 'Claimed on resume; no direct code artifacts found in public repositories.';
    } else if (verdict === 'Adjacent') {
      explanation = `Missing direct evidence, but adjacent to proven skill '${adjacentFrom}'.`;
    } else {
      explanation = 'Not claimed on resume and no public code evidence found.';
    }

    return {
      skillId: id,
      label,
      importance,
      verdict,
      credit,
      adjacentFrom,
      explanation,
      evidenceLinks: evidenceItems.map(e => e.url).filter(Boolean).slice(0, 5),
      evidenceItems: evidenceItems.slice(0, 5)
    };
  });

  const totalRequired = requiredList.length || allJdSkills.length || 1;
  const coverageScore = Math.round(
    (requirements
      .filter(r => r.importance === 'required')
      .reduce((acc, r) => acc + (r.verdict === 'Proven' ? 1 : r.verdict === 'Partial' ? 0.5 : 0), 0) /
      (requiredList.length || 1)) * 100
  );

  const gaps = requirements.filter(r => r.verdict !== 'Proven').map(r => r.skillId);

  return {
    roleTitle: roleTitle || 'Role Match',
    coverage: coverageScore,
    summary: {
      verified: verifiedCount,
      partial: partialCount,
      gaps: gapCount,
      required: requiredList.length
    },
    requirements,
    gaps,
    consentNote: CONSENT_NOTE_SINGLE
  };
}

/**
 * Builds multi-candidate comparison matrix against a JD.
 * PRESERVES CANDIDATE INPUT ORDER.
 * NO ranking, NO totalScore, NO bestCandidate.
 *
 * @param {Array<{token: string, analysis: object|null, error?: string}>} resolvedCandidates
 * @param {string} jdText
 * @returns {object} Compare result according to S5 JSON spec
 */
export function buildPublicCompare(resolvedCandidates, jdText = '') {
  const extracted = extractJobSkills(jdText || '');
  const requiredList = extracted.requiredSkills || [];
  const preferredList = extracted.preferredSkills || [];

  const allJdSkills = [
    ...requiredList.map(id => ({ id, importance: 'required' })),
    ...preferredList.map(id => ({ id, importance: 'preferred' }))
  ];

  const requirements = allJdSkills.map(({ id, importance }) => {
    const info = ONTOLOGY_MAP.get(id) || {};
    return {
      skillId: id,
      label: info.label || id,
      importance
    };
  });

  // Map candidates preserving strictly input order
  const candidates = resolvedCandidates.map(c => {
    if (!c.analysis || c.error) {
      return {
        token: c.token,
        error: c.error || 'ANALYSIS_UNAVAILABLE',
        displayName: null,
        analyzedAt: null,
        coverage: null,
        cells: []
      };
    }

    const { analysis, token } = c;
    const match = buildPublicMatch(analysis, jdText);

    const cells = requirements.map(req => {
      const found = match.requirements.find(r => r.skillId === req.skillId);
      return {
        skillId: req.skillId,
        verdict: found ? found.verdict : 'Missing',
        credit: found ? found.credit : 0,
        adjacentFrom: found ? found.adjacentFrom : null,
        evidenceLinks: found ? found.evidenceLinks : []
      };
    });

    return {
      token,
      displayName: analysis.githubUsername || analysis.github?.login || analysis.candidate?.name || 'Anonymous',
      analyzedAt: analysis.completedAt || analysis.createdAt,
      coverage: match.coverage,
      cells
    };
  });

  return {
    requirements,
    candidates,
    consentNote: CONSENT_NOTE_COMPARE
  };
}
