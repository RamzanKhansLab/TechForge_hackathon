import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Analysis } from '../../models/Analysis.js';
import { getProfile, getRepositories } from '../github/github.service.js';
import { analyzeRepository } from '../github/github.repository.service.js';
import { verifySkills } from '../evidence/evidence.service.js';
import { SCORING } from '../../config/scoring.js';
import { logger } from '../../utils/logger.js';
const owner = randomUUID();
const leaseMs = 120000;
let running = false; let stopping = false; let timer;
let consecutiveFailures = 0;
let nextPollAt = 0;

function workerErrorDetails(error) {
  // Do not log raw database messages, connection strings, query values, or credentials.
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : undefined;
  return {
    errorName: identifier(error?.name) || 'Error',
    errorCode: typeof error?.code === 'number' ? error.code : identifier(error?.code),
    field: identifier(error?.path),
    fieldType: identifier(error?.kind),
  };
}

import { RequestBudget, pLimit } from '../github/github.client.js';
import { rankRepositories, analyzeRepositoryV2, searchExternalContributions } from '../github/github.analyzer.js';
import { Evidence } from '../../models/Evidence.js';

async function runAnalysis(analysis) {
  const filter = { _id: analysis._id, leaseOwner: owner, status: 'processing' };
  const budget = new RequestBudget(120, 30);
  const events = [];

  const addEvent = async (name, detail, counts = {}) => {
    const event = { name, startedAt: new Date(), finishedAt: null, detail, counts };
    events.push(event);
    await Analysis.updateOne(filter, {
      $set: {
        events,
        requestBudget: { totalUsed: budget.usedRequests, remaining: budget.remaining },
        leaseUntil: new Date(Date.now() + leaseMs)
      }
    }).catch(() => {});
    return event;
  };

  const finishEvent = async (event, counts = {}) => {
    event.finishedAt = new Date();
    event.counts = { ...event.counts, ...counts };
    await Analysis.updateOne(filter, {
      $set: {
        events,
        requestBudget: { totalUsed: budget.usedRequests, remaining: budget.remaining },
        leaseUntil: new Date(Date.now() + leaseMs)
      }
    }).catch(() => {});
  };

  const update = async data => {
    const result = await Analysis.updateOne(filter, {
      $set: {
        ...data,
        events,
        requestBudget: { totalUsed: budget.usedRequests, remaining: budget.remaining },
        leaseUntil: new Date(Date.now() + leaseMs)
      }
    });
    if (!result.matchedCount) throw new Error('Analysis lease lost');
  };

  const heartbeat = setInterval(() => {
    update({}).catch(() => logger.warn('analysis_heartbeat_failed', { analysisId: String(analysis._id) }));
  }, 30000);
  heartbeat.unref();

  try {
    // 1. Profile Fetch
    const profileEv = await addEvent('FETCH_PROFILE', `Fetching GitHub profile for @${analysis.githubUsername}`);
    await update({ stage: 'github', progress: 10 });
    const github = await getProfile(analysis.githubUsername);
    await finishEvent(profileEv, { publicRepos: github.publicRepos });

    // 2. Repository Selection & Ranking
    const repoListEv = await addEvent('LIST_REPOSITORIES', `Retrieving repository catalog for @${github.login}`);
    await update({ stage: 'repositories', progress: 20 });
    const selection = await getRepositories(github.login);
    const rankedRepos = rankRepositories(selection.repositories);
    await finishEvent(repoListEv, { eligibleRepos: rankedRepos.length });

    const repositories = [];
    const warnings = [...analysis.warnings];
    if (selection.truncated) warnings.push('Only the first 200 recently pushed repositories were considered.');
    if (!rankedRepos.length) warnings.push('No eligible non-fork, active public repositories were found. Absence of public evidence does not mean absence of skill.');

    // 3. Analyze Repositories with Bounded Concurrency (p-limit 4)
    const limit = pLimit(4);
    let completedRepoCount = 0;

    const repoTasks = rankedRepos.map((repo, idx) => limit(async () => {
      if (budget.isLimited) {
        warnings.push('GitHub API rate limit reached. Analysis completed with partial evidence.');
        return null;
      }
      const ev = await addEvent('SCAN_REPO', `Scanning repo ${idx + 1} of ${rankedRepos.length}: ${repo.name}`);
      try {
        const repoData = await analyzeRepositoryV2(repo, github.login, budget);
        completedRepoCount++;
        await finishEvent(ev, { filesInspected: repoData.evidence.length });
        await update({ progress: 25 + Math.round((completedRepoCount / rankedRepos.length) * 45) });
        return repoData;
      } catch (repoErr) {
        logger.warn('repo_scan_partial_failed', { repo: repo.name, error: repoErr.message });
        return null;
      }
    }));

    const repoResults = (await Promise.all(repoTasks)).filter(Boolean);
    repositories.push(...repoResults);

    // 4. External Contributions Search
    if (budget.canMakeRequest(true)) {
      const extEv = await addEvent('SEARCH_EXTERNAL_PRS', `Searching public pull requests authored by @${github.login}`);
      try {
        const extPRs = await searchExternalContributions(github.login, budget);
        await finishEvent(extEv, { externalPRsFound: extPRs.length });
      } catch (e) {}
    }

    // 5. Evidence Aggregation & Persistence in Evidence collection
    const evPersist = await addEvent('NORMALIZE_EVIDENCE', 'Aggregating normalized evidence items');
    await update({ stage: 'evidence', progress: 78 });
    const allEvidenceItems = repositories.flatMap(r => r.evidence || []);

    if (allEvidenceItems.length > 0) {
      const bulkOps = allEvidenceItems.map(item => ({
        updateOne: {
          filter: { analysisId: analysis._id, deterministicId: item.deterministicId },
          update: {
            $set: {
              analysisId: analysis._id,
              deterministicId: item.deterministicId,
              repo: item.repo,
              kind: item.kind,
              skillId: item.skillId,
              url: item.url,
              path: item.path,
              note: item.note,
              weight: item.weight || 1.0,
              flagged: Boolean(item.flagged)
            }
          },
          upsert: true
        }
      }));
      await Evidence.bulkWrite(bulkOps).catch(() => {});
    }
    await finishEvent(evPersist, { totalEvidenceItems: allEvidenceItems.length });

    // 6. Skill Verification & Classification
    await update({ stage: 'scoring', progress: 88 });
    const skills = verifySkills(analysis.resume.skills, repositories);
    const claimed = skills.filter(skill => skill.claimed);
    const summary = {
      claimed: claimed.length,
      proven: claimed.filter(s => s.status === 'Proven').length,
      partial: claimed.filter(s => s.status === 'Partial').length,
      claimedOnly: claimed.filter(s => s.status === 'Claimed-only').length,
      repositoriesAnalyzed: repositories.length,
      discovered: skills.filter(s => !s.claimed).length,
      coveragePercentage: claimed.length ? Math.round((claimed.filter(s => s.status === 'Proven').length / claimed.length) * 100) : 0,
      trustNote: budget.isLimited ? 'Partial evidence collected due to GitHub API rate limits.' : 'Full code-level evidence collected.'
    };

    await update({ stage: 'report', progress: 95 });
    await Analysis.updateOne(filter, {
      $set: {
        status: 'completed',
        stage: 'completed',
        progress: 100,
        github,
        repositories,
        skills,
        summary,
        warnings,
        events,
        partialEvidence: budget.isLimited,
        partialEvidenceReason: budget.limitReason,
        rateLimitResetAt: budget.limitResetAt,
        requestBudget: { totalUsed: budget.usedRequests, remaining: budget.remaining },
        scoringVersion: SCORING.version,
        completedAt: new Date()
      },
      $unset: { leaseOwner: 1, leaseUntil: 1, error: 1 }
    });
    logger.info('analysis_completed', { analysisId: String(analysis._id), repositories: repositories.length });
  } catch (error) {
    await Analysis.updateOne(filter, {
      $set: {
        status: 'failed',
        stage: 'failed',
        error: { code: error.code || 'ANALYSIS_FAILED', message: error.status ? error.message : 'Analysis was interrupted. Please retry.' },
        events,
        requestBudget: { totalUsed: budget.usedRequests, remaining: budget.remaining }
      },
      $unset: { leaseOwner: 1, leaseUntil: 1 }
    }).catch(() => logger.error('analysis_failure_persist_failed'));
    logger.error('analysis_failed', { analysisId: String(analysis._id), code: error.code || 'ANALYSIS_FAILED' });
  } finally {
    clearInterval(heartbeat);
  }
}
async function tick() {
  if (running || stopping || Date.now() < nextPollAt) return;
  running = true;
  let operation = 'expire_exhausted_analyses';
  try {
    const now = new Date();
    // Global sanitizeFilter remains enabled. Only these server-built comparison
    // conditions are trusted; per-query sanitizeFilter overrides are insufficient.
    await Analysis.updateMany(
      {
        status: 'processing',
        leaseUntil: mongoose.trusted({ $lt: now }),
        attempts: mongoose.trusted({ $gte: 3 }),
      },
      {
        $set: {
          status: 'failed',
          stage: 'failed',
          error: { code: 'WORKER_INTERRUPTED', message: 'Repeated worker interruptions. Please retry the analysis.' },
        },
        $unset: { leaseOwner: 1, leaseUntil: 1 },
      },
    );
    operation = 'claim_analysis';
    const analysis = await Analysis.findOneAndUpdate(
      {
        attempts: mongoose.trusted({ $lt: 3 }),
        $or: [
          { status: 'queued' },
          { status: 'processing', leaseUntil: mongoose.trusted({ $lt: now }) },
        ],
      },
      {
        $set: { status: 'processing', leaseOwner: owner, leaseUntil: new Date(Date.now() + leaseMs) },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { createdAt: 1 } },
    );
    operation = 'run_analysis';
    if (analysis) await runAnalysis(analysis);
    consecutiveFailures = 0;
    nextPollAt = 0;
  } catch (error) {
    consecutiveFailures = Math.min(consecutiveFailures + 1, 5);
    const retryInMs = Math.min(2000 * 2 ** consecutiveFailures, 60000);
    nextPollAt = Date.now() + retryInMs;
    logger.error('worker_tick_failed', { operation, ...workerErrorDetails(error), retryInMs });
  }
  finally { running = false; }
}
export function startWorker() { timer = setInterval(tick, 2000); timer.unref(); void tick(); }
export function stopWorker() { stopping = true; clearInterval(timer); }
