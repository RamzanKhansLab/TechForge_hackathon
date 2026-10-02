import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { Analysis } from '../../models/Analysis.js';
import { JobAnalysis } from '../../models/JobAnalysis.js';
import { newAccess, publicDocument } from '../../utils/access.js';
import { AppError } from '../../utils/AppError.js';
import { forUser, requireOwned } from '../ownership.service.js';
import { uploadResume, deleteResume } from '../storage/cloudinary.service.js';
import { parseResume } from '../resume/resume.service.js';
import { logger } from '../../utils/logger.js';
export async function createAnalysis(file, githubUsername, ownerUserId) {
  if (!file) throw new AppError(400, 'RESUME_REQUIRED', 'Upload a PDF resume.');
  if (file.buffer.subarray(0,5).toString() !== '%PDF-') throw new AppError(400, 'INVALID_PDF', 'Upload a valid PDF document.');
  const asset = await uploadResume(file.buffer);
  try {
    const parsed = await parseResume(file.buffer);
    const { accessTokenHash } = newAccess();
    const analysis = await Analysis.create({ ownerUserId, githubUsername, accessTokenHash, ...parsed, resume: { ...parsed.resume, filename: path.basename(file.originalname).slice(0,120), asset } });
    logger.info('analysis_queued', { analysisId: String(analysis._id) });
    return { analysisId: analysis._id, status: analysis.status };
  } catch (error) { await deleteResume(asset).catch(() => logger.error('upload_rollback_failed')); throw error; }
}
export async function getAnalysis(id, ownerUserId) { return requireOwned(forUser(ownerUserId).analyses.findById(id)); }
export async function retryAnalysis(id, ownerUserId) {
  const analysis = await getAnalysis(id, ownerUserId);
  if (analysis.status !== 'failed') throw new AppError(409, 'ANALYSIS_NOT_FAILED', 'Only a failed analysis can be retried.');
  const updated = await Analysis.findOneAndUpdate({ _id: id, ownerUserId, legacy: false, status: 'failed' }, { $set: { status: 'queued', stage: 'queued', progress: 0, attempts: 0 }, $unset: { error: 1, leaseOwner: 1, leaseUntil: 1 } }, { new: true });
  if (!updated) throw new AppError(409, 'ALREADY_RETRIED', 'This analysis is already queued.');
  return publicDocument(updated);
}
export async function reanalyze(id, ownerUserId) {
  const current = await getAnalysis(id, ownerUserId);
  if (['processing', 'queued'].includes(current.status)) {
    throw new AppError(409, 'ANALYSIS_BUSY', 'Wait for the current analysis to finish before initiating re-analysis.');
  }

  // Find previous completed analysis for the same user / reportId to link
  const previous = await Analysis.findOne({
    reportId: current.reportId || current._id,
    ownerUserId,
    status: 'completed',
    _id: { $ne: current._id }
  }).sort({ createdAt: -1 });

  const { accessTokenHash } = newAccess();
  const nextAnalysis = await Analysis.create({
    reportId: current.reportId || current._id,
    previousAnalysisId: current._id,
    ownerUserId: current.ownerUserId,
    githubUsername: current.githubUsername,
    candidate: current.candidate,
    resume: current.resume,
    accessTokenHash,
    status: 'queued',
    stage: 'queued',
    progress: 0
  });

  logger.info('reanalysis_queued', {
    newAnalysisId: String(nextAnalysis._id),
    previousAnalysisId: String(current._id)
  });

  return { analysisId: nextAnalysis._id, status: nextAnalysis.status };
}

export async function toggleShare(id, isPublic, ownerUserId) {
  const analysis = await getAnalysis(id, ownerUserId);
  const shareId = isPublic ? (analysis.shareId || randomBytes(8).toString('hex')) : null;
  const updated = await Analysis.findByIdAndUpdate(
    id,
    { $set: { isPublic: Boolean(isPublic), shareId } },
    { new: true }
  );
  return {
    isPublic: updated.isPublic,
    shareId: updated.shareId,
    shareUrl: updated.shareId ? `/share/${updated.shareId}` : null
  };
}

export async function getSharedProfile(shareId) {
  const analysis = await Analysis.findOne({ shareId, isPublic: true, status: 'completed' });
  if (!analysis) throw new AppError(404, 'NOT_FOUND', 'This shared candidate report is not publicly available.');
  return publicDocument(analysis);
}

export async function generateAuditExport(id, ownerUserId) {
  const analysis = await getAnalysis(id, ownerUserId);
  const payload = {
    reportId: analysis.reportId || analysis._id,
    analysisId: analysis._id,
    scoringVersion: analysis.scoringVersion || '2.0',
    candidate: {
      githubUsername: analysis.githubUsername,
      name: analysis.candidate?.name || analysis.github?.name,
      analyzedAt: analysis.completedAt || analysis.createdAt
    },
    summary: analysis.summary,
    skills: (analysis.skills || []).map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      score: s.score,
      breakdown: s.breakdown,
      signalsCount: s.evidence?.length || 0,
      evidenceHashes: (s.evidence || []).map(e => e.deterministicId)
    })),
    discrepancyReport: analysis.discrepancyReport,
    auditSignature: createHash('sha256')
      .update(JSON.stringify({
        id: String(analysis._id),
        user: analysis.githubUsername,
        date: analysis.completedAt,
        summary: analysis.summary
      }))
      .digest('hex')
  };
  return payload;
}

import { seedDemoReport } from './sample.fixture.js';

export async function seedDemo() {
  return await seedDemoReport();
}

export async function removeAnalysis(id, ownerUserId) {
  const analysis = await getAnalysis(id, ownerUserId);
  if (['processing','queued'].includes(analysis.status)) throw new AppError(409, 'ANALYSIS_BUSY', 'Wait for analysis to finish before deleting it.');
  await deleteResume(analysis.resume.asset);
  await JobAnalysis.deleteMany({ analysisId: id, ownerUserId });
  await Analysis.deleteOne({ _id: id, ownerUserId });
}



