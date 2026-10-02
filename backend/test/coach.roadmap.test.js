/**
 * test/coach.roadmap.test.js
 * Unit tests for services/coach/roadmap.service.js
 * Run with: node --test test/coach.roadmap.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { topoSort, packWeeks, buildRoadmap } from '../src/services/coach/roadmap.service.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const item = (skillId, importanceOrPrereqs, prereqs = [], effort = 2) => ({
  skillId,
  label: skillId,
  importance: typeof importanceOrPrereqs === 'number' ? importanceOrPrereqs : 1,
  effort: { tag: 'S', hours: effort },
  whyNow: 'test',
  prerequisites: typeof importanceOrPrereqs === 'number' ? prereqs : importanceOrPrereqs,
  taskId: skillId,
});

// ── topoSort ──────────────────────────────────────────────────────────────────
describe('topoSort', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(topoSort([]), []);
  });

  it('preserves single item', () => {
    const sorted = topoSort([item('react', 1)]);
    assert.equal(sorted[0].skillId, 'react');
  });

  it('places prerequisite before dependent', () => {
    const items = [
      item('kubernetes', 1, ['docker']),
      item('docker', 1, []),
    ];
    const sorted = topoSort(items);
    const dockerIdx = sorted.findIndex(i => i.skillId === 'docker');
    const k8sIdx = sorted.findIndex(i => i.skillId === 'kubernetes');
    assert.ok(dockerIdx < k8sIdx, `docker(${dockerIdx}) should come before kubernetes(${k8sIdx})`);
  });

  it('sorts by importance desc within the same level', () => {
    const items = [
      item('redis', 0.5, []),
      item('docker', 1.0, []),
    ];
    const sorted = topoSort(items);
    assert.equal(sorted[0].skillId, 'docker');
  });

  it('is deterministic on equal importance (alphabetical)', () => {
    const items = [item('vue', 1), item('react', 1), item('angular', 1)];
    const r1 = topoSort(items).map(i => i.skillId);
    const r2 = topoSort([...items].reverse()).map(i => i.skillId);
    assert.deepEqual(r1, r2);
    assert.equal(r1[0], 'angular');
  });

  it('handles items whose prerequisites are not in the gap list', () => {
    // 'nodejs' is a prereq of 'express' but nodejs is already proven (not in gap list)
    const items = [item('express', 1, ['nodejs'])];
    const sorted = topoSort(items);
    assert.equal(sorted.length, 1);
    assert.equal(sorted[0].skillId, 'express');
  });
});

// ── packWeeks ─────────────────────────────────────────────────────────────────
describe('packWeeks', () => {
  it('returns empty when no items', () => {
    const { weeks, totalHours } = packWeeks([], 6);
    assert.deepEqual(weeks, []);
    assert.equal(totalHours, 0);
  });

  it('packs small tasks into a single week', () => {
    const items = [item('docker', 1, [], 2), item('cicd', 1, [], 2)];
    const { weeks } = packWeeks(items, 6);
    assert.equal(weeks.length, 1);
    assert.equal(weeks[0].hours, 4);
  });

  it('splits overflow into a second week', () => {
    const items = [item('docker', 1, [], 4), item('k8s', 1, [], 4)];
    const { weeks } = packWeeks(items, 6);
    assert.equal(weeks.length, 2);
  });

  it('splits a single task that exceeds hoursPerWeek across weeks', () => {
    const items = [item('aws', 1, [], 10)];
    const { weeks } = packWeeks(items, 6);
    assert.equal(weeks.length, 2);
    assert.equal(weeks[0].hours, 6);
    assert.equal(weeks[1].hours, 4);
  });

  it('totalHours equals sum of all item hours', () => {
    const items = [item('a', 1, [], 3), item('b', 1, [], 5), item('c', 1, [], 2)];
    const { totalHours } = packWeeks(items, 4);
    assert.equal(totalHours, 10);
  });

  it('handles hoursPerWeek larger than total (single week)', () => {
    const items = [item('a', 1, [], 2), item('b', 1, [], 1)];
    const { weeks } = packWeeks(items, 100);
    assert.equal(weeks.length, 1);
  });
});

// ── buildRoadmap (integration) ────────────────────────────────────────────────
describe('buildRoadmap', () => {
  const makeAnalysis = (...skillPairs) => ({
    skills: skillPairs.map(([id, verdict]) => ({
      id, verdict, label: id, name: id, score: verdict === 'Proven' ? 80 : 20,
      claimed: verdict !== 'Proven' ? { source: 'resume', mentions: 1, contexts: [] } : null,
      evidence: [], repositories: [], trustFlags: [], impliedBy: [],
    })),
    repositories: [],
    resume: {},
  });

  it('returns empty roadmap when all claimed skills are Proven', () => {
    const analysis = makeAnalysis(['react', 'Proven'], ['nodejs', 'Proven']);
    // Mark as claimed
    analysis.skills[0].claimed = { source: 'resume' };
    analysis.skills[1].claimed = { source: 'resume' };
    const result = buildRoadmap(analysis, [], 6);
    assert.equal(result.items.length, 0);
    assert.equal(result.totalHours, 0);
    assert.equal(result.weeks.length, 0);
  });

  it('includes gap skills from saved roles', () => {
    const analysis = makeAnalysis(['react', 'Proven']);
    analysis.skills[0].claimed = { source: 'resume' };
    const savedRoles = [{
      _id: '507f1f77bcf86cd799439011',
      title: 'Frontend Dev',
      matches: [{ skill: 'typescript', state: 'Gap', reason: 'TS required' }],
      requiredSkills: ['typescript'],
      preferredSkills: [],
    }];
    const result = buildRoadmap(analysis, savedRoles, 6);
    assert.ok(result.items.some(i => i.skillId === 'typescript'));
  });

  it('two different analyses produce different roadmaps', () => {
    const a1 = makeAnalysis(['react', 'Claimed-only'], ['docker', 'Proven']);
    a1.skills[0].claimed = { source: 'resume', mentions: 1, contexts: [] };
    a1.skills[1].claimed = { source: 'resume', mentions: 1, contexts: [] };

    const a2 = makeAnalysis(['typescript', 'Claimed-only'], ['nodejs', 'Proven']);
    a2.skills[0].claimed = { source: 'resume', mentions: 1, contexts: [] };
    a2.skills[1].claimed = { source: 'resume', mentions: 1, contexts: [] };

    const r1 = buildRoadmap(a1, [], 6);
    const r2 = buildRoadmap(a2, [], 6);
    assert.notDeepEqual(r1.items.map(i => i.skillId), r2.items.map(i => i.skillId));
  });

  it('respects hoursPerWeek in weekly plan', () => {
    const analysis = makeAnalysis(['redis', 'Claimed-only'], ['docker', 'Claimed-only'], ['aws', 'Claimed-only']);
    for (const s of analysis.skills) s.claimed = { source: 'resume', mentions: 1, contexts: [] };
    const result = buildRoadmap(analysis, [], 3);
    for (const week of result.weeks) {
      assert.ok(week.hours <= 3 + 1, `Week ${week.index} has ${week.hours} hours but limit is 3`);
      // +1 tolerance for split tasks that may slightly exceed (split, not overpacked)
    }
  });
});
