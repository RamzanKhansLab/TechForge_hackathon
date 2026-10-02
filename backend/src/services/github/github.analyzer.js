import { githubGet, getRawFile } from './github.client.js';
import {
  generateEvidenceId,
  MANIFEST_PATTERNS,
  extractDependenciesFromManifest,
  sampleSourceImports,
  evaluateReadme
} from './github.evidence.collector.js';
import { ONTOLOGY } from '../../ontology/ontology.service.js';
import { LANGUAGE_MAP } from '../../data/skills.js';

const ignored = /(^|\/)(node_modules|vendor|dist|build|coverage|\.venv|venv|\.next|\.git)\//i;

/**
 * Ranks repos so budget is spent on the most informative ones:
 * Non-fork, recently pushed, has manifest files.
 */
export function rankRepositories(repos) {
  return [...repos].sort((a, b) => {
    // 1. Non-fork prioritized
    const forkDiff = Number(a.fork) - Number(b.fork);
    if (forkDiff !== 0) return forkDiff;

    // 2. Stars
    const starDiff = (b.stargazers_count || 0) - (a.stargazers_count || 0);
    if (starDiff !== 0) return starDiff;

    // 3. Recently pushed
    const dateA = new Date(a.pushed_at || 0).getTime();
    const dateB = new Date(b.pushed_at || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Deep inspection of a single repository using bounded requests, raw file fetching,
 * and 10 code-level evidence collectors.
 */
export async function analyzeRepositoryV2(repo, username, budget) {
  const repoFullName = repo.full_name || `${repo.owner?.login}/${repo.name}`;
  const owner = repo.owner?.login || repoFullName.split('/')[0];
  const name = repo.name || repoFullName.split('/')[1];
  const defaultBranch = repo.default_branch || 'main';
  const warnings = [];

  // 1. GET repo tree via git/trees/:branch?recursive=1 (one call)
  const treeResp = await githubGet(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(defaultBranch)}`, { recursive: '1' }, budget);
  const tree = treeResp?.data?.tree || [];
  if (treeResp?.data?.truncated) {
    warnings.push('File tree was truncated; inspected first 5,000 entries.');
  }

  // 2. GET languages (bytes)
  const langResp = await githubGet(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`, {}, budget);
  const languages = langResp?.data || {};

  // 3. Filter tree paths of interest
  const allBlobs = tree.filter(t => t.type === 'blob' && !ignored.test(t.path));
  const commitSha = treeResp?.data?.sha || repo.default_branch || 'main';

  // Identify manifests and platform configs
  const manifestFiles = allBlobs.filter(entry =>
    MANIFEST_PATTERNS.some(p => p.pattern.test(entry.path))
  ).slice(0, 40); // cap at 40 files/repo

  const evidenceItems = [];
  const deploymentSignals = [];
  const testFiles = [];
  let readmeData = { readmeScore: 0 };

  // Fetch manifests & configs via raw.githubusercontent.com
  for (const entry of manifestFiles) {
    const rawText = await getRawFile(owner, name, defaultBranch, entry.path, budget);
    if (!rawText) continue;

    // A. Readme evaluation
    if (/README(?:\.(?:md|rst|txt))?$/i.test(entry.path)) {
      readmeData = evaluateReadme(rawText);
      // Check readme tech mentions
      for (const skill of ONTOLOGY) {
        const regex = new RegExp(`\\b${skill.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(rawText)) {
          evidenceItems.push({
            deterministicId: generateEvidenceId(repoFullName, entry.path, skill.id, 'readme'),
            skillId: skill.id,
            kind: 'readme',
            repo: repoFullName,
            path: entry.path,
            url: `https://github.com/${repoFullName}/blob/${commitSha}/${entry.path}`,
            note: `Mentioned in ${entry.path}`,
            weight: 0.5,
            strength: 'supporting'
          });
        }
      }
    }

    // B. Dependencies
    const depHits = extractDependenciesFromManifest(rawText, entry.path, entry.path.split('/').pop());
    for (const hit of depHits) {
      evidenceItems.push({
        deterministicId: generateEvidenceId(repoFullName, entry.path, hit.skillId, hit.kind),
        skillId: hit.skillId,
        kind: hit.kind,
        repo: repoFullName,
        path: entry.path,
        url: `https://github.com/${repoFullName}/blob/${commitSha}/${entry.path}`,
        note: hit.note,
        weight: 1.0,
        strength: 'direct'
      });
    }

    // C. Deployment configs
    if (/Dockerfile/i.test(entry.path)) deploymentSignals.push('Dockerfile');
    if (/docker-compose/i.test(entry.path)) deploymentSignals.push('Docker Compose');
    if (/\.github\/workflows/i.test(entry.path)) deploymentSignals.push('GitHub Actions CI/CD');
    if (/vercel\.json/i.test(entry.path)) deploymentSignals.push('Vercel Config');
    if (/netlify\.toml/i.test(entry.path)) deploymentSignals.push('Netlify Config');
    if (/render\.ya?ml/i.test(entry.path)) deploymentSignals.push('Render Config');
    if (/Procfile/i.test(entry.path)) deploymentSignals.push('Procfile');
  }

  // Repo homepage deployment signal
  if (repo.homepage && typeof repo.homepage === 'string' && repo.homepage.startsWith('http')) {
    deploymentSignals.push(`Live Homepage: ${repo.homepage}`);
  }

  // 4. Test files detection
  const detectedTests = allBlobs.filter(entry =>
    /(?:^|\/)(?:__tests__|tests?|spec)\/|(?:\.test|\.spec)\.[a-zA-Z0-9]+$/i.test(entry.path)
  );
  testFiles.push(...detectedTests.slice(0, 30).map(t => t.path));

  // 5. Source file sampling (up to 8 files, largest non-vendored)
  const sourceCandidates = allBlobs.filter(b =>
    /\.(?:js|jsx|ts|tsx|py|go|rs|java|cpp|c|cs|php|rb|swift|kt)$/i.test(b.path) &&
    !MANIFEST_PATTERNS.some(p => p.pattern.test(b.path))
  ).sort((a, b) => (b.size || 0) - (a.size || 0));

  const sampledImportHits = await sampleSourceImports(repoFullName, defaultBranch, commitSha, sourceCandidates, budget);
  evidenceItems.push(...sampledImportHits);

  // 6. Language byte aggregation -> direct language evidence
  for (const [langName, bytes] of Object.entries(languages)) {
    const skillId = LANGUAGE_MAP[langName];
    if (skillId && bytes >= 100) {
      evidenceItems.push({
        deterministicId: generateEvidenceId(repoFullName, '', skillId, 'language'),
        skillId,
        kind: 'language',
        repo: repoFullName,
        path: null,
        url: `https://github.com/${repoFullName}/search?l=${encodeURIComponent(langName)}`,
        note: `${bytes.toLocaleString()} bytes of ${langName}`,
        weight: 1.0,
        strength: 'direct'
      });
    }
  }

  // 7. Commit history (first page + last page via author filter)
  const commitResp = await githubGet(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits`, { author: username, per_page: 100 }, budget);
  const commits = (commitResp?.data || []).map(c => ({
    sha: c.sha,
    url: c.html_url,
    date: c.commit.author?.date || c.commit.committer?.date,
    message: c.commit.message.split('\n')[0].slice(0, 160)
  }));

  // Activity by month histogram
  const activityByMonth = {};
  for (const c of commits) {
    if (c.date) {
      const monthKey = c.date.slice(0, 7); // YYYY-MM
      activityByMonth[monthKey] = (activityByMonth[monthKey] || 0) + 1;
    }
  }

  return {
    name,
    fullName: repoFullName,
    url: repo.html_url,
    description: repo.description,
    defaultBranch,
    stars: repo.stargazers_count || 0,
    fork: Boolean(repo.fork),
    updatedAt: repo.pushed_at,
    languages,
    commitCount: commits.length,
    latestCommit: commits[0]?.date || null,
    firstCommit: commits.at(-1)?.date || null,
    commits: commits.slice(0, 10),
    activityByMonth,
    deploymentSignals,
    testFilesCount: testFiles.length,
    testFilesSample: testFiles.slice(0, 5),
    readme: readmeData,
    evidence: evidenceItems,
    warnings
  };
}

/**
 * Searches public PRs authored by the user to repositories they do NOT own
 */
export async function searchExternalContributions(username, budget) {
  const query = `author:${username} type:pr -user:${username}`;
  const resp = await githubGet('/search/issues', { q: query, per_page: 20 }, budget, true);

  const items = resp?.data?.items || [];
  const contributions = [];

  for (const pr of items) {
    const repoMatch = pr.html_url.match(/github\.com\/([^/]+\/[^/]+)\/pull/);
    const targetRepo = repoMatch ? repoMatch[1] : 'external/repository';

    contributions.push({
      deterministicId: generateEvidenceId(targetRepo, pr.html_url, 'external', 'pr'),
      repo: targetRepo,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      isMerged: Boolean(pr.pull_request?.merged_at),
      createdAt: pr.created_at
    });
  }

  return contributions;
}
