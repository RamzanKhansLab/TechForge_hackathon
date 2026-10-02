import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalysisDiff } from '../src/services/analysis/diff.service.js';

test('Diff Service: computes positive score delta and newly proven skills', () => {
  const previous = {
    _id: 'prev-123',
    completedAt: new Date('2026-09-01'),
    summary: { claimed: 5, proven: 1, partial: 2, discovered: 0 },
    skills: [
      { id: 'react', name: 'React', category: 'Frontend', score: 35, status: 'Partial' },
      { id: 'node', name: 'Node.js', category: 'Backend', score: 20, status: 'Claimed-only' },
      { id: 'docker', name: 'Docker', category: 'DevOps', score: 70, status: 'Proven' }
    ]
  };

  const current = {
    _id: 'curr-456',
    completedAt: new Date('2026-10-02'),
    summary: { claimed: 5, proven: 2, partial: 1, discovered: 1 },
    skills: [
      { id: 'react', name: 'React', category: 'Frontend', score: 85, status: 'Proven' }, // Now Proven!
      { id: 'node', name: 'Node.js', category: 'Backend', score: 40, status: 'Partial' }, // Score up
      { id: 'docker', name: 'Docker', category: 'DevOps', score: 70, status: 'Proven' }, // Unchanged
      { id: 'mongodb', name: 'MongoDB', category: 'Database', score: 65, status: 'Proven' } // Discovered
    ]
  };

  const diff = computeAnalysisDiff(previous, current);

  assert.ok(diff);
  assert.equal(diff.previousAnalysisId, 'prev-123');
  assert.equal(diff.currentAnalysisId, 'curr-456');

  // React (+50) + Node (+20) + MongoDB (+65) = +135
  assert.equal(diff.scoreDelta, 135);

  // React & MongoDB became Proven
  assert.equal(diff.newlyProvenCount, 2);
  assert.ok(diff.newlyProven.some(s => s.id === 'react'));
  assert.ok(diff.newlyProven.some(s => s.id === 'mongodb'));

  // summaryDelta
  assert.equal(diff.summaryDelta.proven, 1);
  assert.equal(diff.summaryDelta.partial, -1);
  assert.equal(diff.summaryDelta.discovered, 1);
});
