import { analysisInput } from '../middlewares/validation.js';
import * as service from '../services/analysis/analysis.service.js';
import { publicDocument, authorize, newAccess, hashToken } from '../utils/access.js';
import { Analysis } from '../models/Analysis.js';
import { AppError } from '../utils/AppError.js';

const ownerId = req => req.user._id;

export async function create(req, res) {
  const input = analysisInput.parse(req.body);
  res.status(202).json({ success: true, data: await service.createAnalysis(req.file, input.githubUsername, ownerId(req)) });
}
export async function list(req, res) {
  const docs = await Analysis.find({ ownerUserId: ownerId(req) })
    .select('githubUsername status summary isPublic shareId createdAt updatedAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: docs });
}
export async function read(req, res) { res.json({ success: true, data: publicDocument(await service.getAnalysis(req.params.id, ownerId(req))) }); }
export async function skills(req, res) { res.json({ success: true, data: (await service.getAnalysis(req.params.id, ownerId(req))).skills }); }
export async function skill(req, res) {
  const result = (await service.getAnalysis(req.params.id, ownerId(req))).skills.find(item => item.id === req.params.skill);
  if (!result) throw new AppError(404, 'SKILL_NOT_FOUND', 'This skill was not found in the report.');
  res.json({ success: true, data: result });
}
export async function repositories(req, res) { res.json({ success: true, data: (await service.getAnalysis(req.params.id, ownerId(req))).repositories }); }
export async function retry(req, res) { res.status(202).json({ success: true, data: await service.retryAnalysis(req.params.id, ownerId(req)) }); }
export async function reanalyze(req, res) { res.status(202).json({ success: true, data: await service.reanalyze(req.params.id, ownerId(req)) }); }
export async function diff(req, res) { res.json({ success: true, data: (await service.getAnalysis(req.params.id, ownerId(req))).diff || null }); }
export async function share(req, res) { res.json({ success: true, data: await service.toggleShare(req.params.id, req.body.isPublic, ownerId(req)) }); }
export async function auditExport(req, res) { res.json({ success: true, data: await service.generateAuditExport(req.params.id, ownerId(req)) }); }
export async function remove(req, res) { await service.removeAnalysis(req.params.id, ownerId(req)); res.json({ success: true, data: { deleted: true } }); }

export async function claimLegacy(req, res) {
  const accessKey = req.body?.accessKey;
  const report = authorize(await Analysis.findOne({ legacy: true, ownerUserId: null, accessTokenHash: hashToken(accessKey || '') }).select('+accessTokenHash'), accessKey);
  const { accessTokenHash } = newAccess();
  report.ownerUserId = ownerId(req);
  report.legacy = false;
  report.accessTokenHash = accessTokenHash;
  await report.save();
  res.json({ success: true, data: publicDocument(report) });
}

export async function demo(req, res) {
  const report = await Analysis.findOne({ _id: req.params.id, isDemo: true, status: 'completed' });
  if (!report) throw new AppError(404, 'DEMO_NOT_FOUND', 'This demo report could not be found.');
  res.json({ success: true, data: publicDocument(report) });
}
