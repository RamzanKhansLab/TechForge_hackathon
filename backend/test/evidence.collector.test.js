import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEvidenceId,
  extractDependenciesFromManifest,
  evaluateReadme
} from '../src/services/github/github.evidence.collector.js';
import { rankRepositories } from '../src/services/github/github.analyzer.js';

test('Evidence collector: express + jest manifest yields node/express/jest evidence with deterministic IDs', () => {
  const packageJson = JSON.stringify({
    name: 'test-api',
    dependencies: {
      express: '^4.19.2',
      dotenv: '^16.4.5'
    },
    devDependencies: {
      jest: '^29.7.0'
    }
  });

  const hits = extractDependenciesFromManifest(packageJson, 'package.json', 'package.json');
  const skillIds = hits.map(h => h.skillId);

  assert.ok(skillIds.includes('express'), 'Should extract express');
  assert.ok(skillIds.includes('jest'), 'Should extract jest');

  // Verify deterministic ID generation
  const id1 = generateEvidenceId('user/repo', 'package.json', 'express', 'dependency');
  const id2 = generateEvidenceId('user/repo', 'package.json', 'express', 'dependency');
  const idDiff = generateEvidenceId('user/repo', 'package.json', 'jest', 'dependency');

  assert.equal(id1, id2, 'Deterministic IDs must match for identical inputs');
  assert.notEqual(id1, idDiff, 'Deterministic IDs must differ for different skills');
});

test('README quality evaluator evaluates structure, install instructions, links, and length', () => {
  const goodReadme = `# My Project

A production-grade web service.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm run dev
\`\`\`

## Live Demo
Check out the demo at https://myapp.vercel.app

![Architecture](https://example.com/arch.png)
`;

  const evalResult = evaluateReadme(goodReadme);
  assert.ok(evalResult.readmeScore >= 0.8, 'Well-structured README should score high');
  assert.equal(evalResult.hasInstall, true);
  assert.equal(evalResult.hasUsage, true);
  assert.equal(evalResult.hasLiveLink, true);
  assert.equal(evalResult.hasScreenshots, true);

  const emptyEval = evaluateReadme('');
  assert.equal(emptyEval.readmeScore, 0);
});

test('Repository ranking: prioritizes non-forks, stars, and recent push dates', () => {
  const repos = [
    { name: 'forked-repo', fork: true, stargazers_count: 10, pushed_at: '2026-09-01T00:00:00Z' },
    { name: 'old-own-repo', fork: false, stargazers_count: 2, pushed_at: '2025-01-01T00:00:00Z' },
    { name: 'recent-popular-repo', fork: false, stargazers_count: 50, pushed_at: '2026-09-15T00:00:00Z' },
  ];

  const ranked = rankRepositories(repos);
  assert.equal(ranked[0].name, 'recent-popular-repo');
  assert.equal(ranked[1].name, 'old-own-repo');
  assert.equal(ranked[2].name, 'forked-repo');
});
