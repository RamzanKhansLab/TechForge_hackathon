/**
 * test/coach.readiness.test.js
 * Unit tests for services/coach/readiness.service.js
 * Run with: node --test test/coach.readiness.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSentence,
  computeFastestWin,
  skillEffortHours,
  skillImpact,
  buildReadiness,
} from '../src/services/coach/readiness.service.js';

// ── buildSentence ─────────────────────────────────────────────────────────────
describe('buildSentence', () => {
  it('returns no-skills message when claimedCount is 0', () => {
    assert.equal(buildSentence(0, 0), 'No skills were found on the resume.');
  });

  it('returns none-proven message when provenCount is 0', () => {
    const s = buildSentence(0, 5);
    assert.ok(s.includes('None'), `Got: ${s}`);
  });

  it('returns all-proven message when counts match', () => {
    const s = buildSentence(3, 3);
    assert.ok(s.includes('All 3'), `Got: ${s}`);
  });

  it('returns fractional message otherwise', () => {
    const s = buildSentence(4, 9);
    assert.ok(s.includes('4 of 9'), `Got: ${s}`);
    assert.ok(s.includes('proven by code'), `Got: ${s}`);
  });

  it('uses singular "is" for 1 proven', () => {
    const s = buildSentence(1, 4);
    assert.ok(s.includes('is proven'), `Got: ${s}`);
  });
});

// ── skillImpact ───────────────────────────────────────────────────────────────
describe('skillImpact', () => {
  it('returns floor 0.1 when no saved roles', () => {
    assert.equal(skillImpact('docker', []), 0.1);
  });

  it('adds 1.0 for each role where skill is a gap in required', () => {
    const roles = [
      { matches: [{ skill: 'docker', state: 'Gap' }], requiredSkills: ['docker'], preferredSkills: [] },
      { matches: [{ skill: 'docker', state: 'Gap' }], requiredSkills: ['docker'], preferredSkills: [] },
    ];
    // 2 roles × (1 from match + 1 from requiredSkills) but no double count — let's count what the fn actually does
    const impact = skillImpact('docker', roles);
    assert.ok(impact >= 2, `Expected >= 2, got ${impact}`);
  });

  it('adds 0.5 for preferred skills', () => {
    const roles = [
      { matches: [], requiredSkills: [], preferredSkills: ['react'] },
    ];
    const impact = skillImpact('react', roles);
    assert.equal(impact, 0.5);
  });
});

// ── skillEffortHours ──────────────────────────────────────────────────────────
describe('skillEffortHours', () => {
  it('returns at least 1 hour', () => {
    assert.ok(skillEffortHours('docker', ['docker']) >= 1);
  });

  it('is lower when a closely related skill is proven', () => {
    const withAdj = skillEffortHours('typescript', ['javascript']);
    const withoutAdj = skillEffortHours('typescript', []);
    assert.ok(withAdj <= withoutAdj, `withAdj(${withAdj}) should be <= withoutAdj(${withoutAdj})`);
  });
});

// ── computeFastestWin ─────────────────────────────────────────────────────────
describe('computeFastestWin', () => {
  const makeSkill = (id, verdict, label = id) => ({
    id, label, name: label, verdict,
    claimed: { source: 'resume', mentions: 1, contexts: [], claimedYears: null, claimedSince: null },
    evidence: [],
    repositories: [],
  });

  it('returns null when all claimed skills are Proven', () => {
    const skills = [makeSkill('react', 'Proven')];
    assert.equal(computeFastestWin(skills, skills, [], []), null);
  });

  it('returns the single non-proven skill', () => {
    const claimed = [makeSkill('docker', 'Claimed-only'), makeSkill('react', 'Proven')];
    const win = computeFastestWin(claimed, claimed, [], []);
    assert.ok(win, 'should find a win');
    assert.equal(win.skillId, 'docker');
  });

  it('tie-breaks deterministically by skillId (alphabetical)', () => {
    // Both zero roles → equal impact, same difficulty — should pick alphabetically first
    const claimed = [
      makeSkill('typescript', 'Claimed-only'),
      makeSkill('react', 'Claimed-only'),
    ];
    const win = computeFastestWin(claimed, claimed, [], []);
    // 'react' < 'typescript' alphabetically
    assert.equal(win.skillId, 'react');
  });

  it('prioritises skill required by a saved role', () => {
    const claimed = [
      makeSkill('docker', 'Claimed-only'),
      makeSkill('redis', 'Claimed-only'),
    ];
    const savedRoles = [
      { matches: [{ skill: 'docker', state: 'Gap' }], requiredSkills: ['docker'], preferredSkills: [], title: 'SRE' },
    ];
    const win = computeFastestWin(claimed, claimed, [], savedRoles);
    assert.equal(win.skillId, 'docker');
  });
});

// ── buildReadiness (integration over pure data) ───────────────────────────────
describe('buildReadiness', () => {
  const baseAnalysis = {
    skills: [
      { id: 'react', label: 'React', name: 'React', verdict: 'Proven', score: 80,
        claimed: { source: 'resume', mentions: 1, contexts: [], claimedYears: null, claimedSince: null },
        evidence: [{ url: 'https://github.com/u/r/blob/main/package.json', skillId: 'react' }],
        repositories: ['u/r'], trustFlags: [] },
      { id: 'docker', label: 'Docker', name: 'Docker', verdict: 'Claimed-only', score: 0,
        claimed: { source: 'resume', mentions: 1, contexts: [], claimedYears: null, claimedSince: null },
        evidence: [], repositories: [], trustFlags: [] },
      { id: 'rust', label: 'Rust', name: 'Rust', verdict: 'Partial', score: 40,
        claimed: false,
        evidence: [{ url: 'https://github.com/u/r2/blob/main/Cargo.toml', skillId: 'rust' }],
        repositories: ['u/r2'], trustFlags: [] },
    ],
    repositories: [
      { fullName: 'u/r', updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    ],
    resume: {},
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    partialEvidence: false,
    partialEvidenceReason: null,
    rateLimitResetAt: null,
  };

  it('computes correct counts', () => {
    const r = buildReadiness(baseAnalysis);
    assert.equal(r.claimedCount, 2, 'only react and docker are claimed');
    assert.equal(r.provenCount, 1);
    assert.equal(r.partialCount, 0);
    assert.equal(r.claimedOnlyCount, 1);
  });

  it('finds hidden strength (rust – not claimed, but Partial)', () => {
    const r = buildReadiness(baseAnalysis);
    assert.equal(r.hiddenStrengths.length, 1);
    assert.equal(r.hiddenStrengths[0].skillId, 'rust');
  });

  it('fastestWin is docker (only non-proven claimed skill)', () => {
    const r = buildReadiness(baseAnalysis);
    assert.ok(r.fastestWin);
    assert.equal(r.fastestWin.skillId, 'docker');
  });

  it('freshness.stale is true when repo pushed after last analysis', () => {
    const r = buildReadiness(baseAnalysis);
    assert.equal(r.freshness.stale, true);
  });

  it('different analyses produce different sentences', () => {
    const r1 = buildReadiness(baseAnalysis);
    const analysis2 = {
      ...baseAnalysis,
      skills: [
        { ...baseAnalysis.skills[0], verdict: 'Proven' },
        { ...baseAnalysis.skills[1], verdict: 'Proven' },
      ],
    };
    const r2 = buildReadiness(analysis2);
    assert.notEqual(r1.sentence, r2.sentence);
  });
});
