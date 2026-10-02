/**
 * services/coach/resumeFixes.service.js
 * Deterministic rule engine for resume fix suggestions.
 * Seven rule types; no LLM, no generic advice.
 * Pure function – unit-tested in test/coach.resumeFixes.test.js
 */

const README_THRESHOLD = 0.4; // readmeScore below this triggers WEAK_README

/**
 * @param {object} analysis  completed Analysis doc (plain object)
 * @returns {{ fixes: object[], grouped: object }}
 */
export function buildResumeFixes(analysis) {
  const skills = analysis.skills ?? [];
  const repos = analysis.repositories ?? [];
  const resume = analysis.resume ?? {};
  const discrepancy = analysis.discrepancyReport ?? [];

  const claimedSkills = skills.filter(s => s.claimed);
  const claimedIds = new Set(claimedSkills.map(s => s.id));
  const fixes = [];
  let seq = 0;
  const id = tag => `fix-${++seq}-${tag}`;

  // ── RULE 1: UNSUPPORTED_CLAIM ─────────────────────────────────────────────
  // Claimed-only skills → no code evidence at all
  for (const s of claimedSkills) {
    if (s.verdict === 'Claimed-only') {
      fixes.push({
        id: id('unsupported'),
        type: 'UNSUPPORTED_CLAIM',
        skillId: s.id,
        severity: 'high',
        title: `${s.label || s.name} is claimed but has no code evidence`,
        detail: `Your resume lists ${s.label || s.name} but no public repository shows it in use.`,
        action: `Add a public project that uses ${s.label || s.name}, or remove it from your resume.`,
        resumeContext: firstContext(s),
        evidenceLinks: [],
        impact: `Could move ${s.label || s.name} from Claimed-only to Partial once evidence is found.`,
      });
    }
  }

  // ── RULE 2: HIDDEN_STRENGTH ───────────────────────────────────────────────
  // Proven or Partial but not on resume
  for (const s of skills) {
    if (!claimedIds.has(s.id) && (s.verdict === 'Proven' || s.verdict === 'Partial')) {
      const links = (s.evidence ?? []).map(e => e.url).filter(Boolean).slice(0, 2);
      fixes.push({
        id: id('hidden'),
        type: 'HIDDEN_STRENGTH',
        skillId: s.id,
        severity: 'positive',
        title: `${s.label || s.name} is used in ${(s.repositories ?? []).length} repo${(s.repositories ?? []).length === 1 ? '' : 's'} but absent from your resume`,
        detail: `Public code evidence confirms ${s.label || s.name} (${s.verdict}), but it is not listed on your resume.`,
        action: `Add ${s.label || s.name} to your Skills section.`,
        resumeContext: null,
        evidenceLinks: links,
        impact: `Adds 1 ${s.verdict.toLowerCase()} skill to your visible profile.`,
      });
    }
  }

  // ── RULE 3: YEARS_MISMATCH ────────────────────────────────────────────────
  // Reuse discrepancyReport YEARS_MISMATCH entries, phrased as edit suggestions
  for (const finding of discrepancy) {
    if (finding.type === 'YEARS_MISMATCH') {
      const s = skills.find(x => x.id === finding.skillId);
      fixes.push({
        id: id('years'),
        type: 'YEARS_MISMATCH',
        skillId: finding.skillId,
        severity: finding.severity ?? 'medium',
        title: `Years of experience for ${s?.label ?? finding.skillId} may be overstated`,
        detail: finding.message,
        action: `Update the years of experience for ${s?.label ?? finding.skillId} to match your earliest public commit, or add earlier evidence.`,
        resumeContext: firstContext(s),
        evidenceLinks: finding.evidenceLinks ?? [],
        impact: 'Reduces a discrepancy flag on your public evidence sheet.',
      });
    }
  }

  // ── RULE 4: WEAK_README ───────────────────────────────────────────────────
  // Repos carrying skill evidence but with low README score
  const evidencedRepoNames = new Set(
    skills.flatMap(s => s.repositories ?? [])
  );
  for (const repo of repos) {
    const repoName = repo.fullName ?? repo.name;
    if (!evidencedRepoNames.has(repoName)) continue;
    const score = repo.readme?.readmeScore ?? (repo.readme?.description ? 0.5 : 0);
    if (score < README_THRESHOLD) {
      const missing = [];
      if (!repo.readme?.setupInstructions) missing.push('install/run instructions');
      if (!(repo.readme?.deploymentLinks?.length)) missing.push('live link');
      if (!repo.readme?.description) missing.push('project description');
      if (missing.length === 0) missing.push('usage examples');

      // Find which skill IDs this repo supports
      const repoSkillIds = skills
        .filter(s => (s.repositories ?? []).includes(repoName))
        .map(s => s.id);

      fixes.push({
        id: id('readme'),
        type: 'WEAK_README',
        skillId: null,
        severity: 'medium',
        title: `README in ${repoName} is thin`,
        detail: `This repository provides evidence for ${repoSkillIds.join(', ')} but the README is missing: ${missing.join(', ')}.`,
        action: `Add ${missing.join(', ')} to the README in ${repoName}.`,
        resumeContext: null,
        evidenceLinks: [`https://github.com/${repoName}`],
        impact: `Stronger README boosts evidence quality for ${repoSkillIds.join(', ')}.`,
      });
    }
  }

  // ── RULE 5: TUTORIAL_REPO_FLAG ────────────────────────────────────────────
  for (const s of skills) {
    for (const flag of s.trustFlags ?? []) {
      if (flag.code === 'TEMPLATE_OR_TUTORIAL' || flag.code === 'FORK_NO_OWN_COMMITS') {
        fixes.push({
          id: id('tutorial'),
          type: 'TUTORIAL_REPO_FLAG',
          skillId: s.id,
          severity: flag.severity ?? 'medium',
          title: `${flag.repo} looks like a tutorial or fork`,
          detail: flag.explanation,
          action: `Add an original feature, automated tests, or a deployment to ${flag.repo} to demonstrate independent work.`,
          resumeContext: null,
          evidenceLinks: [`https://github.com/${flag.repo}`],
          impact: `Resolving this flag improves evidence trust for ${s.label || s.name}.`,
        });
      }
    }
  }

  // ── RULE 6: NO_LIVE_LINK ──────────────────────────────────────────────────
  for (const repo of repos) {
    const repoName = repo.fullName ?? repo.name;
    if (!evidencedRepoNames.has(repoName)) continue;
    const hasDeployment = repo.deploymentDetected || (repo.deploymentPlatform ?? []).length > 0;
    const hasHomepage = (repo.readme?.deploymentLinks ?? []).length > 0;
    if (hasDeployment && !hasHomepage) {
      fixes.push({
        id: id('nolive'),
        type: 'NO_LIVE_LINK',
        skillId: null,
        severity: 'low',
        title: `${repoName} has deployment signals but no live link`,
        detail: `A deployment was detected in ${repoName} but no homepage URL is set on the repository.`,
        action: `Set the homepage URL in the repository settings (GitHub → About → Website).`,
        resumeContext: null,
        evidenceLinks: [`https://github.com/${repoName}`],
        impact: 'Live link improves the README score and reviewer confidence.',
      });
    }
  }

  // ── RULE 7: SKILLS_SECTION_MISSING ────────────────────────────────────────
  const hasSkillsSection = (resume.skills ?? []).length > 0
    || Object.keys(resume.categories ?? {}).length > 0;
  if (!hasSkillsSection && skills.length > 0) {
    fixes.push({
      id: id('nosection'),
      type: 'SKILLS_SECTION_MISSING',
      skillId: null,
      severity: 'high',
      title: 'No Skills section detected in your resume',
      detail: 'A skills section makes it faster for reviewers and automated tools to identify your capabilities.',
      action: 'Add a Skills section listing your technical skills, grouped by category.',
      resumeContext: null,
      evidenceLinks: [],
      impact: 'Skills section is the primary source used for verification matching.',
    });
  }

  // ── Dedup, sort and group ─────────────────────────────────────────────────
  const severityOrder = { high: 0, medium: 1, low: 2, positive: 3 };
  fixes.sort((a, b) =>
    (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
  );

  const grouped = {};
  for (const fix of fixes) {
    (grouped[fix.type] = grouped[fix.type] ?? []).push(fix.id);
  }

  return { fixes, grouped };
}

// ── internal helpers ──────────────────────────────────────────────────────────

function firstContext(skill) {
  if (!skill) return null;
  return skill.claimed?.contexts?.[0]?.snippet ?? null;
}
