/**
 * test/coach.taskCheck.test.js
 * Unit tests for the pure evaluateCriteria function from taskCheck.service.js
 * (DB-dependent runTaskCheck is integration-tested separately)
 * Run with: node --test test/coach.taskCheck.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCriteria } from '../src/services/coach/taskCheck.service.js';

const makeEvidence = (url, note = '', path = '') => ({ url, note, path, file: path, skillId: 'docker' });

describe('evaluateCriteria', () => {
  it('returns one result per criterion text', () => {
    const criteria = ['Dockerfile present', 'README with setup'];
    const results = evaluateCriteria(criteria, undefined, [], 'docker');
    assert.equal(results.length, 2);
  });

  it('passes criterion when matching evidence exists', () => {
    const evidence = [makeEvidence('https://github.com/u/r/blob/main/Dockerfile', 'dockerfile non-root user')];
    const skill = { evidence };
    const results = evaluateCriteria(['Dockerfile with a non-root user'], skill, [], 'docker');
    assert.equal(results[0].passed, true);
    assert.equal(results[0].evidenceLinks.length, 1);
  });

  it('fails criterion when no matching evidence', () => {
    const evidence = [makeEvidence('https://github.com/u/r/blob/main/package.json', 'react dependency')];
    const skill = { evidence };
    const results = evaluateCriteria(['Dockerfile present'], skill, [], 'docker');
    assert.equal(results[0].passed, false);
  });

  it('provides a lookedFor description for every criterion', () => {
    const results = evaluateCriteria(['Docker image with tests'], undefined, [], 'docker');
    assert.ok(results[0].lookedFor.length > 0);
  });

  it('limits evidenceLinks to 3 per criterion', () => {
    const evidence = Array.from({ length: 10 }, (_, i) =>
      makeEvidence(`https://github.com/u/r/blob/main/dockerfile-${i}`, 'dockerfile')
    );
    const skill = { evidence };
    const results = evaluateCriteria(['Dockerfile'], skill, [], 'docker');
    assert.ok(results[0].evidenceLinks.length <= 3);
  });

  it('handles undefined skill gracefully', () => {
    const results = evaluateCriteria(['Dockerfile'], undefined, [], 'docker');
    assert.equal(results[0].passed, false);
    assert.deepEqual(results[0].evidenceLinks, []);
  });
});

// ── roleCompare tests ──────────────────────────────────────────────────────────
import { buildRoleCompare } from '../src/services/coach/roleCompare.service.js';

describe('buildRoleCompare', () => {
  it('returns empty when no saved roles', () => {
    const result = buildRoleCompare([], []);
    assert.deepEqual(result.roles, []);
    assert.deepEqual(result.sharedGaps, []);
  });

  it('computes per-role summary correctly', () => {
    const roles = [{
      _id: '507f1f77bcf86cd799439011',
      title: 'SRE',
      coverage: 60,
      matches: [
        { skill: 'docker', state: 'Gap' },
        { skill: 'react', state: 'Verified' },
        { skill: 'kubernetes', state: 'Partial' },
      ],
      requiredSkills: ['docker', 'react'],
      preferredSkills: ['kubernetes'],
    }];
    const result = buildRoleCompare(roles, []);
    assert.equal(result.roles.length, 1);
    assert.equal(result.roles[0].verified, 1);
    assert.equal(result.roles[0].gaps, 1);
    assert.equal(result.roles[0].partial, 1);
  });

  it('identifies shared gaps across 2+ roles', () => {
    const roles = [
      {
        _id: '507f1f77bcf86cd799439011', title: 'R1', coverage: 50,
        matches: [{ skill: 'docker', state: 'Gap' }, { skill: 'kubernetes', state: 'Gap' }],
        requiredSkills: ['docker'], preferredSkills: [],
      },
      {
        _id: '507f1f77bcf86cd799439012', title: 'R2', coverage: 40,
        matches: [{ skill: 'docker', state: 'Gap' }, { skill: 'redis', state: 'Gap' }],
        requiredSkills: ['docker'], preferredSkills: [],
      },
    ];
    const result = buildRoleCompare(roles, []);
    const shared = result.sharedGaps;
    assert.ok(shared.some(g => g.skillId === 'docker'), 'docker should be a shared gap');
    assert.ok(!shared.some(g => g.skillId === 'kubernetes'), 'kubernetes only in 1 role');
    assert.ok(!shared.some(g => g.skillId === 'redis'), 'redis only in 1 role');
  });

  it('orders shared gaps by missingInRoles desc', () => {
    const roles = [
      {
        _id: '507f1f77bcf86cd799439013', title: 'R1', coverage: 50,
        matches: [{ skill: 'docker', state: 'Gap' }, { skill: 'aws', state: 'Gap' }],
        requiredSkills: [], preferredSkills: [],
      },
      {
        _id: '507f1f77bcf86cd799439014', title: 'R2', coverage: 40,
        matches: [{ skill: 'docker', state: 'Gap' }, { skill: 'aws', state: 'Gap' }],
        requiredSkills: [], preferredSkills: [],
      },
      {
        _id: '507f1f77bcf86cd799439015', title: 'R3', coverage: 30,
        matches: [{ skill: 'docker', state: 'Gap' }],
        requiredSkills: [], preferredSkills: [],
      },
    ];
    const result = buildRoleCompare(roles, []);
    // docker appears in 3 roles, aws in 2
    assert.equal(result.sharedGaps[0].skillId, 'docker');
    assert.equal(result.sharedGaps[0].missingInRoles, 3);
  });
});
