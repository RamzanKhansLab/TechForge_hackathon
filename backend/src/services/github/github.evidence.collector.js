import { createHash } from 'node:crypto';
import { ONTOLOGY } from '../../ontology/ontology.service.js';
import { getRawFile } from './github.client.js';

/**
 * Deterministic evidence ID: hash(repo + path + skillId + kind)
 */
export function generateEvidenceId(repo, path, skillId, kind) {
  return createHash('sha256')
    .update(`${repo}:${path || ''}:${skillId}:${kind}`)
    .digest('hex');
}

/**
 * Patterns of interest in repo tree (Amendment 1 & Phase 2 Collector)
 */
export const MANIFEST_PATTERNS = [
  { pattern: /(^|\/)package\.json$/i, kind: 'manifest', parser: 'npm' },
  { pattern: /(^|\/)requirements.*\.txt$/i, kind: 'manifest', parser: 'pip' },
  { pattern: /(^|\/)pyproject\.toml$/i, kind: 'manifest', parser: 'pip' },
  { pattern: /(^|\/)Pipfile$/i, kind: 'manifest', parser: 'pip' },
  { pattern: /(^|\/)pom\.xml$/i, kind: 'manifest', parser: 'maven' },
  { pattern: /(^|\/)build\.gradle(?:\.kts)?$/i, kind: 'manifest', parser: 'maven' },
  { pattern: /(^|\/)go\.mod$/i, kind: 'manifest', parser: 'go' },
  { pattern: /(^|\/)Cargo\.toml$/i, kind: 'manifest', parser: 'cargo' },
  { pattern: /(^|\/)composer\.json$/i, kind: 'manifest', parser: 'composer' },
  { pattern: /(^|\/)Gemfile$/i, kind: 'manifest', parser: 'gemfile' },
  { pattern: /(^|\/)Dockerfile(?:\.[^/]*)?$/i, kind: 'deployment', skill: 'docker' },
  { pattern: /(^|\/)docker-compose\.ya?ml$|(^|\/)compose\.ya?ml$/i, kind: 'deployment', skill: 'docker' },
  { pattern: /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i, kind: 'deployment', skill: 'cicd' },
  { pattern: /(^|\/)vercel\.json$/i, kind: 'deployment', skill: 'vercel' },
  { pattern: /(^|\/)netlify\.toml$/i, kind: 'deployment', skill: 'netlify' },
  { pattern: /(^|\/)render\.ya?ml$/i, kind: 'deployment', skill: 'cloud' },
  { pattern: /(^|\/)Procfile$/i, kind: 'deployment', skill: 'cloud' },
  { pattern: /(^|\/)(?:jest|vitest|playwright|cypress)\.config\.[jt]sx?$/i, kind: 'test_config' },
  { pattern: /(^|\/)pytest\.ini$|(^|\/)conftest\.py$/i, kind: 'test_config', skill: 'pytest' },
  { pattern: /(^|\/)README(?:\.(?:md|rst|txt))?$/i, kind: 'readme' },
];

/**
 * Parses package manifests to identify declared dependencies
 */
export function extractDependenciesFromManifest(content, path, filename) {
  const hits = [];

  if (/package\.json$/i.test(filename)) {
    try {
      const pkg = JSON.parse(content);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {})
      };

      for (const [depName, version] of Object.entries(allDeps)) {
        for (const skill of ONTOLOGY) {
          const npmHints = skill.hints?.npm || [];
          if (npmHints.includes(depName.toLowerCase())) {
            hits.push({
              skillId: skill.id,
              kind: 'dependency',
              note: `${depName} ${version} declared in ${filename}`
            });
          }
        }
      }
    } catch (e) {}
  } else if (/requirements.*\.txt$/i.test(filename) || /Pipfile$/i.test(filename)) {
    for (const skill of ONTOLOGY) {
      const pipHints = skill.hints?.pip || [];
      for (const hint of pipHints) {
        const regex = new RegExp(`^\\s*${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[=<>~!]\\S*)?\\s*$`, 'im');
        if (regex.test(content)) {
          hits.push({
            skillId: skill.id,
            kind: 'dependency',
            note: `${hint} declared in ${filename}`
          });
        }
      }
    }
  } else if (/go\.mod$/i.test(filename)) {
    hits.push({ skillId: 'go', kind: 'dependency', note: `Go module defined in ${filename}` });
  } else if (/Cargo\.toml$/i.test(filename)) {
    hits.push({ skillId: 'rust', kind: 'dependency', note: `Cargo package defined in ${filename}` });
  } else if (/pom\.xml$/i.test(filename) || /build\.gradle/i.test(filename)) {
    hits.push({ skillId: 'java', kind: 'dependency', note: `Java project build file ${filename}` });
  }

  return hits;
}

/**
 * Samples up to 8 largest non-vendored source files per repo to run ontology import-regex hints.
 * Never executes code. Treats content strictly as plain text.
 */
export async function sampleSourceImports(repoFullName, branch, commitSha, sourceFiles, budget) {
  const hits = [];
  const sampled = sourceFiles.slice(0, 8);

  for (const file of sampled) {
    const content = await getRawFile(repoFullName.split('/')[0], repoFullName.split('/')[1], branch, file.path, budget);
    if (!content) continue;

    for (const skill of ONTOLOGY) {
      const importRegexes = skill.hints?.imports || [];
      for (const regexStr of importRegexes) {
        try {
          const rx = new RegExp(regexStr, 'm');
          if (rx.test(content)) {
            const permalink = `https://github.com/${repoFullName}/blob/${commitSha}/${file.path}`;
            hits.push({
              deterministicId: generateEvidenceId(repoFullName, file.path, skill.id, 'import'),
              skillId: skill.id,
              kind: 'import',
              repo: repoFullName,
              path: file.path,
              url: permalink,
              note: `Import pattern matched in ${file.path}`,
              weight: 1.0,
              strength: 'direct'
            });
            break;
          }
        } catch (e) {}
      }
    }
  }

  return hits;
}

/**
 * Calculates a deterministic README quality score (0..1)
 */
export function evaluateReadme(readmeText = '') {
  if (!readmeText || typeof readmeText !== 'string') {
    return { readmeScore: 0, headings: 0, length: 0, hasInstall: false, hasUsage: false, hasScreenshots: false, hasLiveLink: false };
  }

  const length = readmeText.length;
  const headings = (readmeText.match(/^#{1,6}\s+.+$/gm) || []).length;
  const hasInstall = /(?:npm\s+install|yarn\s+add|pip\s+install|docker\s+run|installation|getting\s+started)/i.test(readmeText);
  const hasUsage = /(?:usage|how\s+to\s+use|api\s+reference|examples?|quick\s*start)/i.test(readmeText);
  const hasScreenshots = /(?:!\[.*?\]\(.*?\)|<img\s+[^>]*src=)/i.test(readmeText);
  const hasLiveLink = /(?:https?:\/\/[^\s)]+\.(?:vercel\.app|netlify\.app|render\.com|herokuapp\.com|pages\.dev|fly\.dev|github\.io|[a-z]{2,}\b))/i.test(readmeText);

  let score = 0;
  if (length > 200) score += 0.2;
  if (headings >= 3) score += 0.2;
  if (hasInstall) score += 0.2;
  if (hasUsage) score += 0.2;
  if (hasScreenshots || hasLiveLink) score += 0.2;

  return {
    readmeScore: Math.round(score * 100) / 100,
    headings,
    length,
    hasInstall,
    hasUsage,
    hasScreenshots,
    hasLiveLink
  };
}
