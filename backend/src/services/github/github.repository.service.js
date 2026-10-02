import { githubGet, optionalGithub } from './github.service.js';
import { collectRepositoryEvidence } from './github.evidence.service.js';
const relevant = /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|pom\.xml|build\.gradle|Gemfile|Cargo\.toml|go\.mod|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|README(?:\.md|\.rst)?|vercel\.json|render\.ya?ml|netlify\.toml|.*\.tf)$|\.github\/workflows\/[^/]+\.ya?ml$|(?:k8s|kubernetes)\/.*\.ya?ml$/i;
const ignored = /(^|\/)(node_modules|vendor|dist|build|coverage|\.venv|venv|\.next)\//;

export async function analyzeRepository(repo, username) {
  const base = `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`;
  const warnings = [];
  // At most three independent metadata requests at once; file reads are sequential.
  const [languageResponse, treeResponse, commitResponse] = await Promise.all([
    optionalGithub(`${base}/languages`, {}, warnings, 'Language data'),
    optionalGithub(`${base}/git/trees/${encodeURIComponent(repo.default_branch)}`, { recursive: '1' }, warnings, 'File tree'),
    optionalGithub(`${base}/commits`, { author: username, per_page: 100 }, warnings, 'Candidate commits'),
  ]);
  const tree = treeResponse?.data?.tree || [];
  if (treeResponse?.data?.truncated || tree.length > 5000) warnings.push('File tree was truncated; only the first 5,000 entries were considered.');
  const paths = tree.slice(0,5000).filter(entry => entry.type === 'blob' && !ignored.test(entry.path));
  const selected = paths.filter(entry => relevant.test(entry.path) && entry.size <= 100000).sort((a,b) => {
    const priority = path => /package\.json$|requirements|pyproject|pom\.xml|build\.gradle/.test(path) ? 0 : /readme/i.test(path) ? 1 : 2;
    return priority(a.path) - priority(b.path) || a.path.split('/').length - b.path.split('/').length;
  }).slice(0,10);
  const files = [];
  for (const entry of selected) {
    try {
      const { data } = await githubGet(`${base}/contents/${entry.path.split('/').map(encodeURIComponent).join('/')}`, { ref: repo.default_branch });
      if (data.encoding === 'base64' && data.size <= 100000) files.push({ path: entry.path, text: Buffer.from(data.content, 'base64').toString('utf8').slice(0,100000) });
    } catch (error) { if (['GITHUB_RATE_LIMIT','GITHUB_AUTH_FAILED'].includes(error.code)) throw error; warnings.push(`${entry.path} could not be inspected.`); }
  }
  const commits = (commitResponse?.data || []).filter(c => c.author?.login?.toLowerCase() === username.toLowerCase()).map(c => ({ sha: c.sha, url: c.html_url, date: c.commit.author?.date || c.commit.committer?.date, message: c.commit.message.split('\n')[0].slice(0,160) }));
  const languages = languageResponse?.data || {};
  const sampled = Boolean(commitResponse?.hasNext);
  if (sampled) warnings.push('Commit metrics describe at most 100 candidate-authored commits, not lifetime totals.');
  return {
    name: repo.name, fullName: repo.full_name, url: repo.html_url, description: repo.description,
    defaultBranch: repo.default_branch, stars: repo.stargazers_count, updatedAt: repo.pushed_at, languages,
    filesInspected: files.map(f => f.path), warnings,
    commitCount: commits.length, commitCountIsSample: sampled, latestCommit: commits[0]?.date,
    firstCommit: commits.at(-1)?.date,
    commitsLast30Days: commits.filter(c => new Date(c.date) >= new Date(Date.now() - 30 * 86400000)).length,
    commitsLast90Days: commits.filter(c => new Date(c.date) >= new Date(Date.now() - 90 * 86400000)).length,
    commits: commits.slice(0,10), ...collectRepositoryEvidence(repo, languages, paths.map(p => p.path), files, commits),
  };
}
