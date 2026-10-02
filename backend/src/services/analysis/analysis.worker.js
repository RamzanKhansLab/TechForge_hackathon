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

async function runAnalysis(analysis) {
  const filter = { _id: analysis._id, leaseOwner: owner, status: 'processing' };
  const update = async data => {
    const result = await Analysis.updateOne(filter, { $set: { ...data, leaseUntil: new Date(Date.now() + leaseMs) } });
    if (!result.matchedCount) throw new Error('Analysis lease lost');
  };
  const heartbeat = setInterval(() => { update({}).catch(() => logger.warn('analysis_heartbeat_failed', { analysisId: String(analysis._id) })); }, 30000);
  heartbeat.unref();
  try {
    await update({ stage: 'github', progress: 15 });
    const github = await getProfile(analysis.githubUsername);
    const selection = await getRepositories(github.login);
    const repositories = []; const warnings = [...analysis.warnings];
    if (selection.truncated) warnings.push('Only the first 200 recently pushed repositories were considered.');
    if (!selection.repositories.length) warnings.push('No eligible non-fork, active public repositories were found. Absence of public evidence does not mean absence of skill.');
    await update({ github, stage: 'repositories', progress: 25 });
    for (const repo of selection.repositories) {
      repositories.push(await analyzeRepository(repo, github.login));
      await update({ progress: 25 + Math.round(repositories.length / selection.repositories.length * 45) });
    }
    await update({ stage: 'evidence', progress: 78 });
    const skills = verifySkills(analysis.resume.skills, repositories);
    await update({ stage: 'scoring', progress: 88 });
    const claimed = skills.filter(skill => skill.claimed);
    const summary = { claimed: claimed.length, proven: claimed.filter(s => s.status === 'Proven').length, partial: claimed.filter(s => s.status === 'Partial').length, claimedOnly: claimed.filter(s => s.status === 'Claimed-only').length, repositoriesAnalyzed: repositories.length, discovered: skills.filter(s => !s.claimed).length };
    await update({ stage: 'report', progress: 95 });
    await Analysis.updateOne(filter, { $set: { status: 'completed', stage: 'completed', progress: 100, github, repositories, skills, summary, warnings, scoringVersion: SCORING.version, completedAt: new Date() }, $unset: { leaseOwner: 1, leaseUntil: 1, error: 1 } });
    logger.info('analysis_completed', { analysisId: String(analysis._id), repositories: repositories.length });
  } catch (error) {
    await Analysis.updateOne(filter, { $set: { status: 'failed', stage: 'failed', error: { code: error.code || 'ANALYSIS_FAILED', message: error.status ? error.message : 'Analysis was interrupted. Please retry.' } }, $unset: { leaseOwner: 1, leaseUntil: 1 } }).catch(() => logger.error('analysis_failure_persist_failed'));
    logger.error('analysis_failed', { analysisId: String(analysis._id), code: error.code || 'ANALYSIS_FAILED' });
  } finally { clearInterval(heartbeat); }
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
