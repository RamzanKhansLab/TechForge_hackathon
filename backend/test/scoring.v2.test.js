import test from 'node:test';
import assert from 'node:assert/strict';
import { SCORING_V2 } from '../src/config/scoring.v2.js';
import { scoreSkillV2, generateDiscrepancyReport } from '../src/services/evidence/scoring.v2.js';

test('Scoring V2: weights sum to exactly 100', () => {
  const sum = Object.values(SCORING_V2.weights).reduce((a, b) => a + b, 0);
  assert.equal(sum, 100, 'All component weights must sum to 100');
});

test('Scoring V2: monotonicity check - adding evidence never lowers a score', () => {
  const repo = {
    name: 'web-app',
    fullName: 'user/web-app',
    commitCount: 15,
    latestCommit: new Date().toISOString(),
    firstCommit: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
    deploymentSignals: ['Vercel Config'],
    testFilesCount: 5,
    readme: { readmeScore: 0.8 }
  };

  const evidence1 = [
    { kind: 'dependency', repo: 'user/web-app', weight: 1.0, flagged: false }
  ];

  const score1 = scoreSkillV2('react', evidence1, [repo], []);

  const evidence2 = [
    ...evidence1,
    { kind: 'import', repo: 'user/web-app', weight: 1.0, flagged: false },
    { kind: 'readme', repo: 'user/web-app', weight: 0.5, flagged: false }
  ];

  const score2 = scoreSkillV2('react', evidence2, [repo], []);

  assert.ok(score2.score >= score1.score, `Monotonicity violated: ${score2.score} < ${score1.score}`);
  assert.equal(score2.verdict, 'Proven');
});

test('Scoring V2: Implied-only evidence alone cannot reach Proven', () => {
  const repo = {
    name: 'next-app',
    fullName: 'user/next-app',
    commitCount: 20,
    latestCommit: new Date().toISOString(),
    deploymentSignals: ['Vercel Config'],
    testFilesCount: 4,
    readme: { readmeScore: 0.9 }
  };

  // Implied evidence from Next.js to React
  const impliedEvidence = [
    { kind: 'dependency', repo: 'user/next-app', weight: 0.5, implied: true, flagged: false }
  ];

  const result = scoreSkillV2('react', impliedEvidence, [repo], []);
  assert.notEqual(result.verdict, 'Proven', 'Implied evidence alone must never reach Proven');
  assert.equal(result.verdict, 'Partial');
});

test('Discrepancy Report detects YEARS_MISMATCH, NO_ARTIFACT, and POSITIVE hidden strengths', () => {
  const scoredSkills = [
    {
      id: 'python',
      label: 'Python',
      verdict: 'Proven',
      firstSeen: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), // 1 year ago
      repositories: ['user/py-script']
    },
    {
      id: 'rust',
      label: 'Rust',
      verdict: 'Proven',
      firstSeen: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(),
      repositories: ['user/rust-engine']
    }
  ];

  const resumeClaims = [
    { id: 'python', claimedYears: 5 }, // 5 years claimed vs 1 year observed
    { id: 'docker', claimedYears: 2 }   // Docker claimed, but no docker artifact
  ];

  const repos = [
    { fullName: 'user/py-script', deploymentSignals: [], testFilesCount: 0 }
  ];

  const findings = generateDiscrepancyReport(scoredSkills, resumeClaims, repos);

  const yearsMismatch = findings.find(f => f.type === 'YEARS_MISMATCH');
  assert.ok(yearsMismatch, 'Must detect years mismatch');
  assert.ok(yearsMismatch.message.includes('5 years'));

  const noArtifact = findings.find(f => f.type === 'NO_ARTIFACT');
  assert.ok(noArtifact, 'Must detect missing Docker artifact');

  const positive = findings.find(f => f.type === 'POSITIVE');
  assert.ok(positive, 'Must detect Rust as a hidden positive strength not on resume');
  assert.ok(positive.message.includes('Rust'));
});
