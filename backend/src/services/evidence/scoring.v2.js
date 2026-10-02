import { SCORING_V2 } from '../../config/scoring.v2.js';
import { ONTOLOGY_MAP, expand } from '../../ontology/ontology.service.js';

/**
 * Calculates Scoring V2 (0-100) for a given skill from its normalized evidence items
 * and repository context.
 * Pure function: weights sum to 100, monotonicity preserved.
 */
export function scoreSkillV2(skillId, evidence = [], repos = [], externalPRs = [], claimedDetail = null) {
  const cfg = SCORING_V2.weights;
  const now = Date.now();

  // 1. Separate direct code hits (dependencies, imports, languages)
  const codeHits = evidence.filter(e => ['dependency', 'import', 'language'].includes(e.kind || e.type));
  const hasUnflaggedCodeEvidence = codeHits.some(e => !e.flagged && (e.kind === 'dependency' || e.kind === 'import'));
  const isImpliedOnly = evidence.length > 0 && evidence.every(e => e.implied);

  // Distinct evidenced repos
  const evidencedRepoNames = [...new Set(evidence.map(e => e.repo || e.repository).filter(Boolean))];
  const evidencedRepos = repos.filter(r => evidencedRepoNames.includes(r.fullName || r.name));

  // --- COMPONENT 1: USAGE (max 25) ---
  // Diminishing returns: 1 - e^(-x/3) where x is weighted code hits + distinct repos
  const totalCodeWeight = codeHits.reduce((acc, h) => acc + (h.weight || 1.0), 0);
  const repoBonus = evidencedRepoNames.length * 1.5;
  const usageRaw = (totalCodeWeight + repoBonus) / 4.0;
  const usageScore = Math.min(cfg.usage, Math.round(cfg.usage * (1 - Math.exp(-usageRaw))));

  // --- COMPONENT 2: RECENCY (max 15) ---
  // Exponential decay with 12 month half-life from lastSeen
  let latestDate = null;
  for (const r of evidencedRepos) {
    if (r.latestCommit) {
      const d = new Date(r.latestCommit).getTime();
      if (!latestDate || d > latestDate) latestDate = d;
    }
  }
  let recencyScore = 0;
  let monthsSinceLastSeen = null;
  if (latestDate) {
    monthsSinceLastSeen = Math.max(0, (now - latestDate) / (1000 * 3600 * 24 * 30.4));
    // half-life of 12 months: 0.5^(months / 12)
    const decay = Math.pow(0.5, monthsSinceLastSeen / 12);
    recencyScore = Math.min(cfg.recency, Math.round(cfg.recency * decay));
  }

  // --- COMPONENT 3: DEPTH (max 20) ---
  // Based on commit count across evidenced repos, repo age span, and stars
  let totalCommits = 0;
  let totalStars = 0;
  let earliestDate = null;

  for (const r of evidencedRepos) {
    totalCommits += (r.commitCount || 0);
    totalStars += (r.stars || 0);
    if (r.firstCommit) {
      const d = new Date(r.firstCommit).getTime();
      if (!earliestDate || d < earliestDate) earliestDate = d;
    }
  }

  let depthRatio = 0;
  if (totalCommits >= 1) depthRatio += 0.35;
  if (totalCommits >= 10) depthRatio += 0.35;
  if (totalCommits >= 30) depthRatio += 0.15;
  if (earliestDate && latestDate && (latestDate - earliestDate) > (180 * 24 * 3600 * 1000)) {
    depthRatio += 0.15; // Sustained work over >6 months
  }
  const depthScore = Math.min(cfg.depth, Math.round(cfg.depth * Math.min(1.0, depthRatio)));

  // --- COMPONENT 4: TESTS (max 10) ---
  const hasTests = evidencedRepos.some(r => (r.testFilesCount || 0) > 0 || r.testingDetected);
  const testScore = hasTests ? cfg.tests : 0;

  // --- COMPONENT 5: DEPLOYMENT (max 10) ---
  const hasDeployment = evidencedRepos.some(r => (r.deploymentSignals?.length || 0) > 0 || r.deploymentDetected);
  const deploymentScore = hasDeployment ? cfg.deployment : 0;

  // --- COMPONENT 6: README (max 5) ---
  let bestReadme = 0;
  for (const r of evidencedRepos) {
    const s = r.readme?.readmeScore || (r.readme?.description ? 0.5 : 0);
    if (s > bestReadme) bestReadme = s;
  }
  const readmeScore = Math.min(cfg.readme, Math.round(cfg.readme * bestReadme));

  // --- COMPONENT 7: EXTERNAL CONTRIBUTIONS (max 15) ---
  // Merged PRs authored to external repos
  let externalScore = 0;
  if (externalPRs.length > 0) {
    const mergedCount = externalPRs.filter(p => p.isMerged).length;
    const totalPRs = externalPRs.length;
    const ratio = Math.min(1.0, (mergedCount * 0.7 + totalPRs * 0.3) / 3.0);
    externalScore = Math.min(cfg.external, Math.round(cfg.external * ratio));
  }

  // Raw score sum
  const breakdown = {
    usage: usageScore,
    recency: recencyScore,
    depth: depthScore,
    tests: testScore,
    deployment: deploymentScore,
    readme: readmeScore,
    external: externalScore
  };

  const rawScore = usageScore + recencyScore + depthScore + testScore + deploymentScore + readmeScore + externalScore;
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine Verdict:
  // Proven requires: score >= 70 AND at least one unflagged code-level evidence item AND lastSeen within 24 months AND NOT implied-only
  let verdict = 'Claimed-only';

  const isRecentEnough = monthsSinceLastSeen !== null && monthsSinceLastSeen <= SCORING_V2.thresholds.maxProvenRecencyMonths;

  if (score >= SCORING_V2.thresholds.provenScore && hasUnflaggedCodeEvidence && isRecentEnough && !isImpliedOnly) {
    verdict = 'Proven';
  } else if (score >= SCORING_V2.thresholds.partialScore || (score >= SCORING_V2.thresholds.provenScore && (isImpliedOnly || !hasUnflaggedCodeEvidence))) {
    verdict = 'Partial';
  } else {
    verdict = 'Claimed-only';
  }

  // Monthly activity aggregation
  const activityByMonth = {};
  for (const r of evidencedRepos) {
    if (r.activityByMonth) {
      for (const [m, c] of Object.entries(r.activityByMonth)) {
        activityByMonth[m] = (activityByMonth[m] || 0) + c;
      }
    }
  }

  // Breakdown list for UI rendering
  const breakdownList = [
    { rule: 'usage', points: usageScore, description: `${evidencedRepoNames.length} repos, ${codeHits.length} direct declarations` },
    { rule: 'recency', points: recencyScore, description: latestDate ? `Last used ${monthsSinceLastSeen < 1 ? 'this month' : `${Math.round(monthsSinceLastSeen)} months ago`}` : 'No recent public commit' },
    { rule: 'depth', points: depthScore, description: `${totalCommits} author commits inspected across repos` },
    { rule: 'tests', points: testScore, description: hasTests ? 'Test directory or framework detected' : 'No test suite found' },
    { rule: 'deployment', points: deploymentScore, description: hasDeployment ? 'Deployment / CI pipeline detected' : 'No deployment signal' },
    { rule: 'readme', points: readmeScore, description: `Project README quality score: ${Math.round(bestReadme * 100)}%` },
    { rule: 'external', points: externalScore, description: externalScore > 0 ? `${externalPRs.length} external contributions detected` : 'No external PRs found' },
  ];

  const skillMeta = ONTOLOGY_MAP.get(skillId) || { label: skillId, category: 'other' };

  return {
    id: skillId,
    name: skillMeta.label,
    label: skillMeta.label,
    category: skillMeta.category,
    verdict,
    status: verdict, // backward compatibility
    score,
    breakdown,
    breakdownMax: SCORING_V2.weights,
    breakdownList,
    firstSeen: earliestDate ? new Date(earliestDate) : null,
    lastSeen: latestDate ? new Date(latestDate) : null,
    activityByMonth,
    repositories: evidencedRepoNames,
    trustFlags: evidencedRepos.flatMap(r => r.trustFlags || []),
    evidence
  };
}

/**
 * Builds the Discrepancy Report from candidate skills, resume claims, and repository signals.
 */
export function generateDiscrepancyReport(scoredSkills = [], resumeClaims = [], repos = []) {
  const findings = [];
  const skillById = new Map(scoredSkills.map(s => [s.id, s]));
  const currentYear = new Date().getFullYear();

  // 1. YEARS_MISMATCH: Claimed years vs first commit
  for (const claim of resumeClaims) {
    if (claim.claimedYears && claim.claimedYears >= 2) {
      const skill = skillById.get(claim.id);
      if (skill && skill.firstSeen) {
        const firstYear = new Date(skill.firstSeen).getFullYear();
        const observedYears = Math.max(0, currentYear - firstYear);
        if (claim.claimedYears - observedYears >= 2) {
          findings.push({
            type: 'YEARS_MISMATCH',
            skillId: claim.id,
            severity: 'medium',
            message: `Resume claims ${claim.claimedYears} years of ${skill.label}. Earliest public commit found is from ${firstYear} (${observedYears} yr observed).`,
            evidenceLinks: skill.evidence?.map(e => e.url).filter(Boolean).slice(0, 2) || []
          });
        }
      }
    }
  }

  // 2. NO_ARTIFACT: Claims Docker, CI, Tests, Kubernetes but no artifact exists in any repo
  const checkArtifacts = [
    { id: 'docker', test: r => r.deploymentSignals?.some(s => /docker/i.test(s)), label: 'Dockerfile or Docker Compose' },
    { id: 'cicd', test: r => r.deploymentSignals?.some(s => /ci|github actions/i.test(s)), label: 'CI/CD workflow' },
    { id: 'testing', test: r => (r.testFilesCount || 0) > 0, label: 'automated test suite' }
  ];

  for (const item of checkArtifacts) {
    const isClaimed = resumeClaims.some(c => c.id === item.id);
    if (isClaimed) {
      const hasArtifact = repos.some(item.test);
      if (!hasArtifact) {
        findings.push({
          type: 'NO_ARTIFACT',
          skillId: item.id,
          severity: 'medium',
          message: `Resume claims ${item.id.toUpperCase()}, but no ${item.label} was found in any inspected public repository.`,
          evidenceLinks: []
        });
      }
    }
  }

  // 3. RECENCY_GAP: Primary claimed skill last used > 18 months ago
  for (const skill of scoredSkills) {
    if (skill.verdict !== 'Claimed-only' && skill.lastSeen) {
      const months = (Date.now() - new Date(skill.lastSeen).getTime()) / (1000 * 3600 * 24 * 30.4);
      if (months > 18) {
        findings.push({
          type: 'RECENCY_GAP',
          skillId: skill.id,
          severity: 'low',
          message: `Last public commit with ${skill.label} was ${Math.round(months)} months ago (${new Date(skill.lastSeen).toLocaleDateString()}).`,
          evidenceLinks: skill.evidence?.map(e => e.url).filter(Boolean).slice(0, 1) || []
        });
      }
    }
  }

  // 4. POSITIVE: Discovered skills not mentioned on resume
  const claimedIds = new Set(resumeClaims.map(c => c.id));
  for (const skill of scoredSkills) {
    if (!claimedIds.has(skill.id) && skill.verdict === 'Proven') {
      findings.push({
        type: 'POSITIVE',
        skillId: skill.id,
        severity: 'positive',
        message: `Resume does not mention ${skill.label}, but ${skill.repositories.length} public ${skill.repositories.length === 1 ? 'repo uses' : 'repos use'} it with proven code evidence.`,
        evidenceLinks: skill.evidence?.map(e => e.url).filter(Boolean).slice(0, 2) || []
      });
    }
  }

  return findings;
}
