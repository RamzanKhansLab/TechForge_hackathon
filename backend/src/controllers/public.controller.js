import { Analysis } from '../models/Analysis.js';
import { ShareAccessLog } from '../models/ShareAccessLog.js';
import { publicDocument } from '../utils/access.js';
import { AppError } from '../utils/AppError.js';
import { buildPublicMatch, buildPublicCompare } from '../services/recruiter/publicMatch.service.js';

const SHARE_ERROR = () => new AppError(404, 'SHARE_LINK_INVALID_OR_REVOKED', 'This shared report is unavailable.');

async function sharedReport(token) {
  const analysis = await Analysis.findOne({ shareId: token, isPublic: true, legacy: false, status: 'completed' });
  if (!analysis) throw SHARE_ERROR();
  return analysis;
}

async function recordAccess(analysis, recruiter, action) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const existing = await ShareAccessLog.findOne({ reportId: analysis._id, recruiterUserId: recruiter._id, action, openedAt: { $gte: since } });
  if (!existing) {
    await ShareAccessLog.create({ reportId: analysis._id, shareTokenId: analysis.shareId, recruiterUserId: recruiter._id, recruiterOrg: recruiter.orgName, action });
  }
}

function profilePayload(analysis) {
  const doc = publicDocument(analysis);
  return {
    handle: doc.githubUsername || doc.github?.login || 'candidate',
    analyzedAt: doc.completedAt || doc.createdAt,
    summary: doc.summary || {},
    skills: doc.skills || [],
    discrepancyReport: doc.discrepancyReport || [],
    repositories: (doc.repositories || []).map(repo => ({ name: repo.name, fullName: repo.fullName, url: repo.url, updatedAt: repo.updatedAt, evidence: repo.evidence || [] }))
  };
}

export async function getProfile(req, res) {
  const analysis = await sharedReport(req.params.shareToken);
  await recordAccess(analysis, req.user, 'view');
  res.json({ success: true, data: profilePayload(analysis) });
}

export async function getSummary(req, res) {
  const analysis = await sharedReport(req.params.shareToken);
  await recordAccess(analysis, req.user, 'view');
  const profile = profilePayload(analysis);
  res.json({ success: true, data: { handle: profile.handle, analyzedAt: profile.analyzedAt, summary: profile.summary, discrepancyFindings: profile.discrepancyReport } });
}

export async function matchJd(req, res) {
  const { jdText, roleTitle } = req.body;
  if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 10) throw new AppError(400, 'INVALID_JD_TEXT', 'Please provide a valid job description with at least 10 characters.');
  const analysis = await sharedReport(req.params.shareToken);
  await recordAccess(analysis, req.user, 'match');
  res.json({ success: true, data: buildPublicMatch(publicDocument(analysis), jdText, roleTitle) });
}

export async function compareCandidates(req, res) {
  const { jdText, tokens } = req.body;
  if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 10) throw new AppError(400, 'INVALID_JD_TEXT', 'Please provide a valid job description with at least 10 characters.');
  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 4) throw new AppError(400, 'INVALID_TOKENS', 'Provide between 1 and 4 share tokens to compare.');
  const resolved = await Promise.all(tokens.map(async token => {
    try {
      const analysis = await sharedReport(token);
      await recordAccess(analysis, req.user, 'compare');
      return { token, analysis: publicDocument(analysis) };
    } catch (error) {
      return { token, analysis: null, error: error.code || 'TOKEN_INVALID_OR_REVOKED' };
    }
  }));
  res.json({ success: true, data: buildPublicCompare(resolved, jdText) });
}

export async function opened(req, res) {
  const logs = await ShareAccessLog.find({ recruiterUserId: req.user._id }).sort({ openedAt: -1 }).lean();
  const reportIds = [...new Set(logs.map(log => String(log.reportId)))];
  const reports = await Analysis.find({ _id: { $in: reportIds } }).lean();
  const byId = new Map(reports.map(report => [String(report._id), report]));
  const entries = [];
  for (const log of logs) {
    const report = byId.get(String(log.reportId));
    if (!report) continue;
    if (entries.some(entry => entry.shareToken === log.shareTokenId)) continue;
    entries.push({ shareToken: log.shareTokenId, handle: report.githubUsername, analyzedAt: report.completedAt || report.createdAt, lastOpened: log.openedAt, status: report.isPublic && report.shareId === log.shareTokenId ? 'active' : 'revoked' });
  }
  res.json({ success: true, data: entries });
}

export async function accessLog(req, res) {
  const report = await Analysis.findOne({ _id: req.params.id, ownerUserId: req.user._id, legacy: false });
  if (!report) throw new AppError(404, 'NOT_FOUND', 'This report could not be found.');
  const entries = await ShareAccessLog.find({ reportId: report._id }).sort({ openedAt: -1 }).lean();
  res.json({ success: true, data: entries.map(entry => ({ recruiterOrg: entry.recruiterOrg, openedAt: entry.openedAt, action: entry.action })) });
}
