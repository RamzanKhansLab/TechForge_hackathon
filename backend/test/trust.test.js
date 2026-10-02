import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRepoTrustFlags, jaccardSimilarity } from '../src/trust/trust.service.js';

test('Trust signal: FORK_NO_OWN_COMMITS flags forks with no candidate commits', () => {
  const repoMeta = { fullName: 'user/forked-repo', fork: true, username: 'user' };
  const commits = [
    { author: 'original-author', message: 'feat: add core' }
  ];
  const { trustFlags, effectiveMultiplier } = computeRepoTrustFlags(repoMeta, commits, []);

  const forkFlag = trustFlags.find(f => f.code === 'FORK_NO_OWN_COMMITS');
  assert.ok(forkFlag, 'Must flag fork with no own commits');
  assert.equal(forkFlag.severity, 'high');
  assert.equal(effectiveMultiplier, 0.2);
});

test('Trust signal: TEMPLATE_OR_TUTORIAL flags tutorial names and README boilerplate', () => {
  const repoMeta = { fullName: 'user/react-todo-app', fork: false };
  const { trustFlags } = computeRepoTrustFlags(repoMeta, [], [], 'A simple todo app created following YouTube tutorial');

  const tutorialFlag = trustFlags.find(f => f.code === 'TEMPLATE_OR_TUTORIAL');
  assert.ok(tutorialFlag, 'Must flag todo-app / tutorial');
  assert.equal(tutorialFlag.severity, 'medium');
});

test('Trust signal: SINGLE_COMMIT_DUMP flags repos with a single commit dump', () => {
  const repoMeta = { fullName: 'user/code-dump', commitCount: 1, size: 5000 };
  const commits = [{ message: 'Initial commit' }];
  const { trustFlags } = computeRepoTrustFlags(repoMeta, commits, ['file1.js', 'file2.js']);

  const dumpFlag = trustFlags.find(f => f.code === 'SINGLE_COMMIT_DUMP');
  assert.ok(dumpFlag, 'Must flag single commit dump');
  assert.equal(dumpFlag.severity, 'high');
});

test('Trust signal: COMMIT_BURST flags burst of commits in 24 hours', () => {
  const baseTime = new Date('2026-09-01T10:00:00Z').getTime();
  const commits = [
    { date: new Date(baseTime).toISOString() },
    { date: new Date(baseTime + 3600 * 1000).toISOString() },
    { date: new Date(baseTime + 7200 * 1000).toISOString() },
    { date: new Date(baseTime + 10800 * 1000).toISOString() },
    { date: new Date(baseTime + 14400 * 1000).toISOString() },
  ];
  const repoMeta = { fullName: 'user/hackathon-burst' };
  const { trustFlags } = computeRepoTrustFlags(repoMeta, commits, []);

  const burstFlag = trustFlags.find(f => f.code === 'COMMIT_BURST');
  assert.ok(burstFlag, 'Must flag >80% commits in 24 hours');
  assert.equal(burstFlag.severity, 'medium');
});

test('Trust signal: VENDORED_CODE flags node_modules and .venv in repo', () => {
  const files = [
    { path: 'src/index.js' },
    { path: 'node_modules/express/index.js' }
  ];
  const { trustFlags } = computeRepoTrustFlags({ fullName: 'user/bad-repo' }, [], files);

  const vendoredFlag = trustFlags.find(f => f.code === 'VENDORED_CODE');
  assert.ok(vendoredFlag, 'Must flag vendored node_modules');
});

test('README Jaccard similarity detects Create-React-App boilerplate README', () => {
  const craReadme = `# Getting Started with Create React App
This project was bootstrapped with Create React App.
Available Scripts
In the project directory, you can run: npm start`;

  const sim = jaccardSimilarity(craReadme, craReadme);
  assert.equal(sim, 1.0);

  const { trustFlags } = computeRepoTrustFlags({ fullName: 'user/boilerplate-cra' }, [], [], craReadme);
  const bpFlag = trustFlags.find(f => f.code === 'README_BOILERPLATE');
  assert.ok(bpFlag, 'Must flag create-react-app boilerplate readme');
});

test('Genuine active repository receives no negative flags (multiplier = 1.0)', () => {
  const genuineCommits = [
    { date: '2025-01-10T12:00:00Z', isOwnAuthor: true },
    { date: '2025-03-15T14:00:00Z', isOwnAuthor: true },
    { date: '2025-06-20T10:00:00Z', isOwnAuthor: true },
    { date: '2025-09-05T16:00:00Z', isOwnAuthor: true },
    { date: '2026-02-12T11:00:00Z', isOwnAuthor: true },
    { date: '2026-08-18T09:00:00Z', isOwnAuthor: true }
  ];
  const genuineFiles = [
    { path: 'src/core.py' },
    { path: 'src/utils.py' },
    { path: 'tests/test_core.py' },
    { path: 'pyproject.toml' }
  ];
  const genuineReadme = `# Production Data Engine
A high-throughput distributed ingestion system built with Python, PySpark, and PostgreSQL.
## Installation
Run pip install -e .
## Usage
Configure pipeline in config.yaml and execute python -m engine.
## Architecture
Documented in docs/architecture.md.`;

  const { trustFlags, effectiveMultiplier } = computeRepoTrustFlags(
    { fullName: 'user/data-engine', commitCount: 6, size: 4500 },
    genuineCommits,
    genuineFiles,
    genuineReadme
  );

  assert.equal(trustFlags.length, 0, 'Genuine repository should not have trust flags');
  assert.equal(effectiveMultiplier, 1.0);
});
