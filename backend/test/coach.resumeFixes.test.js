/**
 * test/coach.resumeFixes.test.js
 * Unit tests for services/coach/resumeFixes.service.js
 * Run with: node --test test/coach.resumeFixes.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildResumeFixes } from '../src/services/coach/resumeFixes.service.js';

const BASE_ANALYSIS = {
  skills: [],
  repositories: [],
  resume: { skills: ['react'], categories: { framework: ['react'] } },
  discrepancyReport: [],
};

function makeSkill(id, verdict, claimed = true, evidenceUrls = [], trustFlags = [], repos = []) {
  return {
    id, label: id.charAt(0).toUpperCase() + id.slice(1), name: id,
    verdict, score: verdict === 'Proven' ? 80 : verdict === 'Partial' ? 40 : 0,
    claimed: claimed ? { source: 'resume', mentions: 1, contexts: [{ section: 'skills', snippet: `…${id}…` }], claimedYears: null, claimedSince: null } : false,
    evidence: evidenceUrls.map(url => ({ url, skillId: id })),
    repositories: repos,
    trustFlags,
  };
}

function makeRepo(fullName, opts = {}) {
  return {
    fullName,
    name: fullName.split('/')[1],
    readme: { readmeScore: opts.readmeScore ?? 0.8, description: opts.description ?? 'A project', setupInstructions: opts.setupInstructions ?? true, deploymentLinks: opts.deploymentLinks ?? [] },
    deploymentDetected: opts.deploymentDetected ?? false,
    deploymentPlatform: opts.deploymentPlatform ?? [],
    evidence: opts.evidence ?? [],
  };
}

// ── RULE 1: UNSUPPORTED_CLAIM ─────────────────────────────────────────────────
describe('UNSUPPORTED_CLAIM rule', () => {
  it('flags a Claimed-only skill', () => {
    const analysis = { ...BASE_ANALYSIS, skills: [makeSkill('docker', 'Claimed-only')] };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'UNSUPPORTED_CLAIM');
    assert.ok(fix, 'expected UNSUPPORTED_CLAIM fix');
    assert.equal(fix.skillId, 'docker');
    assert.equal(fix.severity, 'high');
  });

  it('does not flag a Partial skill', () => {
    const analysis = { ...BASE_ANALYSIS, skills: [makeSkill('docker', 'Partial', true, ['https://g.com/f'])] };
    const { fixes } = buildResumeFixes(analysis);
    const unsupported = fixes.filter(f => f.type === 'UNSUPPORTED_CLAIM');
    assert.equal(unsupported.length, 0);
  });
});

// ── RULE 2: HIDDEN_STRENGTH ───────────────────────────────────────────────────
describe('HIDDEN_STRENGTH rule', () => {
  it('flags a Proven skill not claimed on resume', () => {
    const analysis = { ...BASE_ANALYSIS, skills: [makeSkill('rust', 'Proven', false, ['https://g.com/Cargo.toml'])] };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'HIDDEN_STRENGTH');
    assert.ok(fix);
    assert.equal(fix.skillId, 'rust');
    assert.equal(fix.severity, 'positive');
    assert.ok(fix.evidenceLinks.length > 0);
  });

  it('does not flag a Claimed-only skill as hidden strength', () => {
    const analysis = { ...BASE_ANALYSIS, skills: [makeSkill('rust', 'Claimed-only', false)] };
    const { fixes } = buildResumeFixes(analysis);
    assert.equal(fixes.filter(f => f.type === 'HIDDEN_STRENGTH').length, 0);
  });
});

// ── RULE 3: YEARS_MISMATCH ────────────────────────────────────────────────────
describe('YEARS_MISMATCH rule', () => {
  it('converts discrepancy report YEARS_MISMATCH into a fix', () => {
    const analysis = {
      ...BASE_ANALYSIS,
      skills: [makeSkill('react', 'Proven', true, ['https://g.com/pkg.json'])],
      discrepancyReport: [{
        type: 'YEARS_MISMATCH', skillId: 'react', severity: 'medium',
        message: 'Resume claims 5 years. Observed: 2 years.',
        evidenceLinks: ['https://g.com/commit'],
      }],
    };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'YEARS_MISMATCH');
    assert.ok(fix);
    assert.equal(fix.skillId, 'react');
  });
});

// ── RULE 4: WEAK_README ───────────────────────────────────────────────────────
describe('WEAK_README rule', () => {
  it('flags a repo with low readme score that carries skill evidence', () => {
    const skill = makeSkill('nodejs', 'Proven', true, [], [], ['u/api']);
    const repo = makeRepo('u/api', { readmeScore: 0.2, setupInstructions: false });
    repo.evidence = [{ skillId: 'nodejs', url: 'https://g.com/package.json' }];
    const analysis = { ...BASE_ANALYSIS, skills: [skill], repositories: [repo] };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'WEAK_README');
    assert.ok(fix, 'expected WEAK_README');
  });

  it('does not flag a repo with good readme', () => {
    const skill = makeSkill('nodejs', 'Proven', true, [], [], ['u/api']);
    const repo = makeRepo('u/api', { readmeScore: 0.9, setupInstructions: true });
    repo.evidence = [{ skillId: 'nodejs', url: 'https://g.com/package.json' }];
    const analysis = { ...BASE_ANALYSIS, skills: [skill], repositories: [repo] };
    const { fixes } = buildResumeFixes(analysis);
    assert.equal(fixes.filter(f => f.type === 'WEAK_README').length, 0);
  });
});

// ── RULE 5: TUTORIAL_REPO_FLAG ────────────────────────────────────────────────
describe('TUTORIAL_REPO_FLAG rule', () => {
  it('flags skills with TEMPLATE_OR_TUTORIAL trust flag', () => {
    const skill = makeSkill('react', 'Partial', true, [], [
      { code: 'TEMPLATE_OR_TUTORIAL', severity: 'medium', repo: 'u/todo', explanation: 'Looks like a tutorial.' }
    ]);
    const analysis = { ...BASE_ANALYSIS, skills: [skill] };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'TUTORIAL_REPO_FLAG');
    assert.ok(fix);
    assert.ok(fix.evidenceLinks[0].includes('u/todo'));
  });
});

// ── RULE 6: NO_LIVE_LINK ─────────────────────────────────────────────────────
describe('NO_LIVE_LINK rule', () => {
  it('flags repos with deployment but no homepage', () => {
    const skill = makeSkill('nodejs', 'Proven', true, [], [], ['u/api']);
    const repo = makeRepo('u/api', { readmeScore: 0.8, deploymentDetected: true, deploymentLinks: [] });
    repo.evidence = [{ skillId: 'nodejs' }];
    const analysis = { ...BASE_ANALYSIS, skills: [skill], repositories: [repo] };
    const { fixes } = buildResumeFixes(analysis);
    const fix = fixes.find(f => f.type === 'NO_LIVE_LINK');
    assert.ok(fix);
  });

  it('does not flag repos without deployment signals', () => {
    const skill = makeSkill('nodejs', 'Proven', true, [], [], ['u/api']);
    const repo = makeRepo('u/api', { deploymentDetected: false });
    repo.evidence = [{ skillId: 'nodejs' }];
    const analysis = { ...BASE_ANALYSIS, skills: [skill], repositories: [repo] };
    const { fixes } = buildResumeFixes(analysis);
    assert.equal(fixes.filter(f => f.type === 'NO_LIVE_LINK').length, 0);
  });
});

// ── RULE 7: SKILLS_SECTION_MISSING ────────────────────────────────────────────
describe('SKILLS_SECTION_MISSING rule', () => {
  it('flags when resume has no skills section', () => {
    const analysis = {
      ...BASE_ANALYSIS,
      resume: { skills: [], categories: {} },
      skills: [makeSkill('docker', 'Claimed-only')],
    };
    const { fixes } = buildResumeFixes(analysis);
    assert.ok(fixes.some(f => f.type === 'SKILLS_SECTION_MISSING'));
  });

  it('does not flag when skills section is present', () => {
    const analysis = { ...BASE_ANALYSIS, resume: { skills: ['docker'], categories: {} }, skills: [] };
    const { fixes } = buildResumeFixes(analysis);
    assert.equal(fixes.filter(f => f.type === 'SKILLS_SECTION_MISSING').length, 0);
  });
});

// ── Grouping and ordering ──────────────────────────────────────────────────────
describe('fix ordering and grouping', () => {
  it('high-severity fixes come before medium and positive', () => {
    const analysis = {
      ...BASE_ANALYSIS,
      skills: [
        makeSkill('docker', 'Claimed-only', true),     // UNSUPPORTED = high
        makeSkill('rust', 'Proven', false, ['https://g.com/Cargo.toml']), // HIDDEN = positive
      ],
    };
    const { fixes } = buildResumeFixes(analysis);
    const severityOrder = { high: 0, medium: 1, low: 2, positive: 3 };
    for (let i = 1; i < fixes.length; i++) {
      assert.ok(
        severityOrder[fixes[i-1].severity] <= severityOrder[fixes[i].severity],
        `Fix ${i-1} (${fixes[i-1].severity}) should come before fix ${i} (${fixes[i].severity})`
      );
    }
  });

  it('grouped object contains correct type keys', () => {
    const analysis = {
      ...BASE_ANALYSIS,
      skills: [makeSkill('docker', 'Claimed-only', true)],
    };
    const { grouped } = buildResumeFixes(analysis);
    assert.ok(grouped.UNSUPPORTED_CLAIM);
    assert.ok(Array.isArray(grouped.UNSUPPORTED_CLAIM));
  });
});
