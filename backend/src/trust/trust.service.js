import { TRUST_CONFIG } from './trust.config.js';

/**
 * Computes shingled word-level Jaccard similarity between two texts.
 */
export function jaccardSimilarity(textA, textB, k = 2) {
  if (!textA || !textB) return 0;
  const wordsA = textA.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const wordsB = textB.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  if (wordsA.length < k || wordsB.length < k) return 0;

  const shingle = (words) => {
    const set = new Set();
    for (let i = 0; i <= words.length - k; i++) {
      set.add(words.slice(i, i + k).join(' '));
    }
    return set;
  };

  const setA = shingle(wordsA);
  const setB = shingle(wordsB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes all anti-gaming trust signals for a repository.
 * Never drops evidence; multiplies weight by severity multiplier.
 */
export function computeRepoTrustFlags(repoMeta, commits = [], files = [], readmeText = '') {
  const flags = [];
  const fullName = repoMeta.fullName || repoMeta.name || 'unknown/repo';

  // 1. FORK_NO_OWN_COMMITS
  if (repoMeta.fork) {
    const ownCommits = commits.filter(c => c.author?.toLowerCase() === repoMeta.username?.toLowerCase() || c.isOwnAuthor);
    if (ownCommits.length === 0) {
      flags.push({
        code: 'FORK_NO_OWN_COMMITS',
        severity: 'high',
        repo: fullName,
        explanation: 'Forked repository with 0 detected candidate-authored commits.',
        weightMultiplier: TRUST_CONFIG.multipliers.high
      });
    }
  }

  // 2. TEMPLATE_OR_TUTORIAL
  const searchableText = `${repoMeta.name || ''} ${repoMeta.description || ''} ${readmeText || ''}`;
  const isTemplate = Boolean(repoMeta.is_template);
  const matchesTutorial = TRUST_CONFIG.tutorialPatterns.some(rx => rx.test(searchableText));

  if (isTemplate || matchesTutorial) {
    flags.push({
      code: 'TEMPLATE_OR_TUTORIAL',
      severity: 'medium',
      repo: fullName,
      explanation: 'Repository matches common tutorial, boilerplate, or assignment template patterns.',
      weightMultiplier: TRUST_CONFIG.multipliers.medium
    });
  }

  // 3. SINGLE_COMMIT_DUMP
  if (commits.length > 0) {
    const totalCommits = repoMeta.commitCount || commits.length;
    if (totalCommits === 1 && (repoMeta.size || 0) > 500) {
      flags.push({
        code: 'SINGLE_COMMIT_DUMP',
        severity: 'high',
        repo: fullName,
        explanation: 'Entire repository content was dumped in a single commit.',
        weightMultiplier: TRUST_CONFIG.multipliers.high
      });
    }
  }

  // 4. TINY_REPO
  const fileCount = files.length;
  if (fileCount > 0 && fileCount < TRUST_CONFIG.thresholds.tinyRepoMinFiles) {
    flags.push({
      code: 'TINY_REPO',
      severity: 'low',
      repo: fullName,
      explanation: `Repository contains fewer than ${TRUST_CONFIG.thresholds.tinyRepoMinFiles} source files.`,
      weightMultiplier: TRUST_CONFIG.multipliers.low
    });
  }

  // 5. COMMIT_BURST (>80% commits within 24h window)
  if (commits.length >= 5) {
    const dates = commits.map(c => new Date(c.date).getTime()).filter(Boolean).sort((a, b) => a - b);
    if (dates.length >= 5) {
      const windowMs = TRUST_CONFIG.thresholds.commitBurstWindowHours * 3600 * 1000;
      let maxBurst = 0;
      for (let i = 0; i < dates.length; i++) {
        let count = 0;
        for (let j = i; j < dates.length; j++) {
          if (dates[j] - dates[i] <= windowMs) count++;
          else break;
        }
        if (count > maxBurst) maxBurst = count;
      }

      if (maxBurst / dates.length >= TRUST_CONFIG.thresholds.commitBurstShare) {
        flags.push({
          code: 'COMMIT_BURST',
          severity: 'medium',
          repo: fullName,
          explanation: `Over ${Math.round(TRUST_CONFIG.thresholds.commitBurstShare * 100)}% of repository commits occurred in a single 24-hour window.`,
          weightMultiplier: TRUST_CONFIG.multipliers.medium
        });
      }
    }
  }

  // 6. VENDORED_CODE
  const vendoredHit = files.some(f => TRUST_CONFIG.vendoredPatterns.some(p => p.test(f.path || f)));
  if (vendoredHit) {
    flags.push({
      code: 'VENDORED_CODE',
      severity: 'medium',
      repo: fullName,
      explanation: 'Vendored dependencies or precompiled builds (e.g. node_modules, dist, .venv) committed directly to git.',
      weightMultiplier: TRUST_CONFIG.multipliers.medium
    });
  }

  // 7. README_BOILERPLATE
  if (readmeText) {
    const wordCount = readmeText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < TRUST_CONFIG.thresholds.minReadmeWords) {
      flags.push({
        code: 'README_BOILERPLATE',
        severity: 'low',
        repo: fullName,
        explanation: 'README is minimal (fewer than 30 words) or missing project documentation.',
        weightMultiplier: TRUST_CONFIG.multipliers.low
      });
    } else {
      for (const tpl of TRUST_CONFIG.boilerplateReadmes) {
        const sim = jaccardSimilarity(readmeText, tpl, 2);
        if (sim >= TRUST_CONFIG.thresholds.jaccardBoilerplateThreshold) {
          flags.push({
            code: 'README_BOILERPLATE',
            severity: 'medium',
            repo: fullName,
            explanation: `README has high similarity (${Math.round(sim * 100)}%) to default framework boilerplate.`,
            weightMultiplier: TRUST_CONFIG.multipliers.medium
          });
          break;
        }
      }
    }
  }

  // Calculate effective combined multiplier: min of multipliers, floor at 0.1
  const effectiveMultiplier = flags.length === 0
    ? 1.0
    : Math.max(0.1, Math.min(...flags.map(f => f.weightMultiplier)));

  return {
    trustFlags: flags,
    effectiveMultiplier
  };
}
