/**
 * services/coach/taskCheck.service.js
 *
 * Targeted re-check for a single micro-task:
 * - Re-fetches ONLY repos relevant to the task (starterHint repo + repos pushed since last snapshot)
 * - Uses ETags so unchanged repos cost 0 API calls
 * - Re-computes ONLY the affected skills
 * - Evaluates each acceptance criterion against the new evidence
 * - Persists a lightweight snapshot on the parent Analysis chain
 * - Enforces a 2-minute cooldown per task (stored in GithubCache with TTL)
 */
import { Analysis } from '../../models/Analysis.js';
import { JobAnalysis } from '../../models/JobAnalysis.js';
import { GithubCache } from '../../models/GithubCache.js';
import { AppError } from '../../utils/AppError.js';
import { forUser, requireOwned } from '../ownership.service.js';
import { analyzeRepositoryV2 } from '../github/github.analyzer.js';
import { verifySkills } from '../evidence/evidence.service.js';
import { RequestBudget } from '../github/github.client.js';
import { githubGet } from '../github/github.client.js';
import { logger } from '../../utils/logger.js';
import { microTaskFor } from '../../data/microTasks.js';

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Run a targeted task check.
 *
 * @param {string} analysisId
 * @param {string} taskId      – micro-task / skill ID
 * @param {string} token       – X-Access-Token
 * @returns {object}  { criteria, skillChanges, requestsUsed, cooldown }
 */
export async function runTaskCheck(analysisId, taskId, ownerUserId) {
  // ── auth ──────────────────────────────────────────────────────────────────
  const analysis = await requireOwned(forUser(ownerUserId).analyses.findById(analysisId));
  if (analysis.status !== 'completed') {
    throw new AppError(409, 'ANALYSIS_NOT_READY', 'Analysis must be completed before running a task check.');
  }

  // ── cooldown ──────────────────────────────────────────────────────────────
  const cooldownKey = `taskcheck:cooldown:${analysisId}:${taskId}`;
  const existing = await GithubCache.findOne({ key: cooldownKey });
  if (existing) {
    const retryAfter = Math.ceil((new Date(existing.expiresAt).getTime() - Date.now()) / 1000);
    throw new AppError(429, 'TASK_CHECK_COOLDOWN', 'Task re-check is on cooldown. Try again shortly.', { retryAfter });
  }

  // Set cooldown immediately so concurrent calls are blocked
  const expiresAt = new Date(Date.now() + COOLDOWN_MS);
  await GithubCache.findOneAndUpdate(
    { key: cooldownKey },
    { key: cooldownKey, data: { taskId }, etag: null, status: 200, expiresAt },
    { upsert: true, new: true }
  );

  // ── identify task and relevant repos ─────────────────────────────────────
  const task = microTaskFor(taskId);
  const skillId = taskId;

  // Repos that had evidence for this skill before, or pushed since last analysis
  const lastAnalyzedAt = analysis.completedAt ?? analysis.createdAt;
  const relevantRepos = (analysis.repositories ?? []).filter(repo => {
    const hasEvidence = (repo.evidence ?? []).some(e => (e.skillId ?? e.skill) === skillId);
    const pushedAfter = repo.updatedAt && new Date(repo.updatedAt) > new Date(lastAnalyzedAt);
    return hasEvidence || pushedAfter;
  });

  const username = analysis.githubUsername;
  const budget = new RequestBudget(30, 10); // small budget for targeted re-check
  let requestsUsed = 0;

  // ── re-fetch relevant repos (ETag-gated) ──────────────────────────────────
  const freshRepos = [];
  for (const oldRepo of relevantRepos) {
    if (!budget.canMakeRequest()) break;
    try {
      const repoName = oldRepo.fullName ?? oldRepo.name;
      const [owner, name] = repoName.split('/');
      const freshData = await analyzeRepositoryV2(
        { full_name: repoName, owner: { login: owner }, name, default_branch: oldRepo.defaultBranch ?? 'main' },
        username,
        budget
      );
      freshRepos.push(freshData);
    } catch (err) {
      logger.warn('task_check_repo_error', { repo: oldRepo.fullName, err: err.message });
    }
  }
  requestsUsed = budget.usedRequests;

  // ── re-score only affected skills ─────────────────────────────────────────
  const claimedSkills = (analysis.skills ?? []).filter(s => s.claimed).map(s => s.id);
  const detailedClaims = (analysis.resume?.detailedSkills ?? []);

  // Merge: use fresh repos where available, keep old for others
  const repoMap = new Map((analysis.repositories ?? []).map(r => [r.fullName ?? r.name, r]));
  for (const r of freshRepos) repoMap.set(r.fullName ?? r.name, r);
  const mergedRepos = [...repoMap.values()];

  const newSkills = verifySkills(claimedSkills, mergedRepos, [], detailedClaims);
  const newSkill = newSkills.find(s => s.id === skillId);
  const oldSkill = (analysis.skills ?? []).find(s => s.id === skillId);

  // ── evaluate criteria ─────────────────────────────────────────────────────
  const criteria = evaluateCriteria(task.expectedOutput ?? [], newSkill, freshRepos, skillId);

  // ── compute skill changes ─────────────────────────────────────────────────
  const skillChanges = [];
  if (oldSkill && newSkill) {
    const from = oldSkill.verdict;
    const to = newSkill.verdict;
    const scoreDelta = (newSkill.score ?? 0) - (oldSkill.score ?? 0);

    if (from !== to || scoreDelta !== 0) {
      const oldUrls = new Set((oldSkill.evidence ?? []).map(e => e.url).filter(Boolean));
      const newEvidence = (newSkill.evidence ?? [])
        .filter(e => e.url && !oldUrls.has(e.url))
        .map(e => e.url);

      skillChanges.push({ skillId, from, to, scoreDelta, newEvidence });
    }
  }

  // ── persist lightweight snapshot ──────────────────────────────────────────
  if (skillChanges.some(c => c.from !== c.to)) {
    await Analysis.findByIdAndUpdate(analysisId, {
      $set: {
        [`skills.${(analysis.skills ?? []).findIndex(s => s.id === skillId)}`]: newSkill,
      }
    }).catch(err => logger.warn('task_check_snapshot_fail', { err: err.message }));
  }

  return {
    criteria,
    skillChanges,
    requestsUsed,
    cooldown: COOLDOWN_MS / 1000,
  };
}

// ── pure criterion evaluator (exported for tests) ─────────────────────────────

/**
 * Evaluate acceptance criteria against fresh evidence.
 * Each criterion text is matched heuristically against evidence items.
 *
 * @param {string[]} criteriaTexts
 * @param {object|undefined} skill  – re-scored skill object
 * @param {object[]} repos          – freshly analysed repos
 * @param {string} skillId
 * @returns {Array} criteria result objects
 */
export function evaluateCriteria(criteriaTexts, skill, repos, skillId) {
  return criteriaTexts.map(text => {
    const lower = text.toLowerCase();

    // Evidence links relevant to this criterion
    const matchingEvidence = (skill?.evidence ?? []).filter(e => {
      const note = (e.note ?? '').toLowerCase();
      const path = (e.path ?? e.file ?? '').toLowerCase();
      const url = (e.url ?? '').toLowerCase();
      // Keyword matching: look for key words from criterion text in evidence
      const keywords = lower.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      return keywords.some(kw => note.includes(kw) || path.includes(kw) || url.includes(kw));
    });

    // A criterion passes if we found related evidence
    const passed = matchingEvidence.length > 0;
    const evidenceLinks = matchingEvidence.map(e => e.url).filter(Boolean).slice(0, 3);

    // lookedFor: describe what we searched for
    const lookedFor = `File path, dependency, or commit matching: ${lower.slice(0, 80)}`;

    return { text, passed, evidenceLinks, lookedFor };
  });
}
