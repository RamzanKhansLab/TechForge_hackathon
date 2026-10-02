/**
 * test/recruiter.public.test.js
 * Unit tests for recruiter lens services:
 * - verifyInstruction()
 * - buildPublicMatch()
 * - buildPublicCompare()
 *
 * Checks strict ethics guardrails:
 * - Preserves candidate input order
 * - No total score, no rank, no winner, no best candidate
 * - Handles missing/revoked tokens gracefully
 * Run with: node --test test/recruiter.public.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyInstruction } from '../src/services/recruiter/verify.service.js';
import { buildPublicMatch, buildPublicCompare } from '../src/services/recruiter/publicMatch.service.js';

describe('verifyInstruction', () => {
  it('generates manifest instruction for package.json', () => {
    const text = verifyInstruction({
      repo: 'octocat/demo',
      path: 'package.json',
      kind: 'manifest',
      url: 'https://github.com/octocat/demo/blob/main/package.json'
    });
    assert.match(text, /package\.json/);
    assert.match(text, /octocat\/demo/);
    assert.match(text, /Direct link:/);
  });

  it('generates docker instruction for Dockerfile', () => {
    const text = verifyInstruction({
      repo: 'octocat/demo',
      path: 'Dockerfile',
      kind: 'dockerfile',
      url: 'https://github.com/octocat/demo/blob/main/Dockerfile'
    });
    assert.match(text, /Dockerfile/);
    assert.match(text, /base image/);
  });

  it('generates test suite instruction for test files', () => {
    const text = verifyInstruction({
      repo: 'octocat/demo',
      path: 'test/auth.test.js',
      kind: 'test_suite',
      url: 'https://github.com/octocat/demo/blob/main/test/auth.test.js'
    });
    assert.match(text, /test file 'test\/auth\.test\.js'/);
  });

  it('generates workflow instruction for GitHub Actions', () => {
    const text = verifyInstruction({
      repo: 'octocat/demo',
      path: '.github/workflows/ci.yml',
      kind: 'ci_workflow',
      url: 'https://github.com/octocat/demo/blob/main/.github/workflows/ci.yml'
    });
    assert.match(text, /workflow definition/);
  });
});

describe('buildPublicMatch', () => {
  const mockCandidate = {
    githubUsername: 'octocat',
    skills: [
      { id: 'react', label: 'React', verdict: 'Proven', evidence: [{ url: 'https://github.com/octocat/web/blob/main/package.json', path: 'package.json', kind: 'manifest' }] },
      { id: 'node', label: 'Node.js', verdict: 'Partial', evidence: [{ url: 'https://github.com/octocat/api/blob/main/index.js', path: 'index.js', kind: 'code_symbol' }] },
      { id: 'docker', label: 'Docker', verdict: 'Claimed-only', evidence: [] }
    ]
  };

  const sampleJd = `
    Senior Full Stack Engineer
    Requirements:
    - Must have strong experience with React and Docker
    - Required: Node.js
    Nice to have:
    - Kubernetes
  `;

  it('calculates coverage and separates verified from gaps', () => {
    const res = buildPublicMatch(mockCandidate, sampleJd, 'Full Stack Role');
    assert.equal(res.roleTitle, 'Full Stack Role');
    assert.ok(typeof res.coverage === 'number');
    assert.ok(res.requirements.length > 0);
    assert.ok(res.consentNote.includes('Not a hiring recommendation'));

    const reactReq = res.requirements.find(r => r.skillId === 'react');
    assert.ok(reactReq);
    assert.equal(reactReq.verdict, 'Proven');
    assert.equal(reactReq.credit, 1);
    assert.equal(reactReq.evidenceLinks.length, 1);

    const dockerReq = res.requirements.find(r => r.skillId === 'docker');
    assert.ok(dockerReq);
    assert.equal(dockerReq.verdict, 'Claimed-only');
    assert.equal(dockerReq.credit, 0);
  });
});

describe('buildPublicCompare (Ethics Guardrails & Order Invariants)', () => {
  const candidateA = {
    githubUsername: 'alice',
    skills: [
      { id: 'react', label: 'React', verdict: 'Proven', evidence: [{ url: 'https://github.com/alice/app/blob/main/package.json' }] },
      { id: 'docker', label: 'Docker', verdict: 'Proven', evidence: [{ url: 'https://github.com/alice/app/blob/main/Dockerfile' }] }
    ]
  };

  const candidateB = {
    githubUsername: 'bob',
    skills: [
      { id: 'react', label: 'React', verdict: 'Claimed-only', evidence: [] },
      { id: 'docker', label: 'Docker', verdict: 'Claimed-only', evidence: [] }
    ]
  };

  const sampleJd = `
    Requirements:
    - React
    - Docker
  `;

  it('strictly preserves candidate input order (no ranking)', () => {
    // Pass Bob first, Alice second
    const res1 = buildPublicCompare([
      { token: 'token-bob', analysis: candidateB },
      { token: 'token-alice', analysis: candidateA }
    ], sampleJd);

    assert.equal(res1.candidates[0].token, 'token-bob');
    assert.equal(res1.candidates[1].token, 'token-alice');

    // Pass Alice first, Bob second
    const res2 = buildPublicCompare([
      { token: 'token-alice', analysis: candidateA },
      { token: 'token-bob', analysis: candidateB }
    ], sampleJd);

    assert.equal(res2.candidates[0].token, 'token-alice');
    assert.equal(res2.candidates[1].token, 'token-bob');
  });

  it('does NOT include ranking, winner, or recommendation fields', () => {
    const res = buildPublicCompare([
      { token: 'token-bob', analysis: candidateB },
      { token: 'token-alice', analysis: candidateA }
    ], sampleJd);

    assert.equal(res.rank, undefined);
    assert.equal(res.winner, undefined);
    assert.equal(res.bestCandidate, undefined);
    assert.equal(res.recommended, undefined);

    for (const c of res.candidates) {
      assert.equal(c.rank, undefined);
      assert.equal(c.winner, undefined);
      assert.equal(c.isBest, undefined);
    }
  });

  it('handles revoked or invalid tokens in multi-candidate compare gracefully', () => {
    const res = buildPublicCompare([
      { token: 'valid-alice', analysis: candidateA },
      { token: 'revoked-token', analysis: null, error: 'TOKEN_INVALID_OR_REVOKED' }
    ], sampleJd);

    assert.equal(res.candidates.length, 2);
    assert.equal(res.candidates[0].token, 'valid-alice');
    assert.equal(res.candidates[0].displayName, 'alice');
    assert.equal(res.candidates[1].token, 'revoked-token');
    assert.equal(res.candidates[1].error, 'TOKEN_INVALID_OR_REVOKED');
    assert.equal(res.candidates[1].cells.length, 0);
  });
});
