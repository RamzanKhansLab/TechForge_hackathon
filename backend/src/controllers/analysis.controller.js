import { analysisInput } from '../middlewares/validation.js';
import * as service from '../services/analysis/analysis.service.js';
import { publicDocument } from '../utils/access.js';
import { AppError } from '../utils/AppError.js';
const token = req => req.get('X-Access-Token');
export async function create(req,res) { const input = analysisInput.parse(req.body); res.status(202).json({ success: true, data: await service.createAnalysis(req.file,input.githubUsername) }); }
export async function read(req,res) { res.json({ success: true, data: publicDocument(await service.getAnalysis(req.params.id,token(req))) }); }
export async function skills(req,res) { const analysis = await service.getAnalysis(req.params.id,token(req)); res.json({ success: true, data: analysis.skills }); }
export async function skill(req,res) {
  const analysis = await service.getAnalysis(req.params.id,token(req));
  const result = analysis.skills.find(item => item.id === req.params.skill);
  if (!result) throw new AppError(404,'SKILL_NOT_FOUND','This skill was not found in the report.');
  res.json({ success: true, data: result });
}
export async function repositories(req,res) { const analysis = await service.getAnalysis(req.params.id,token(req)); res.json({ success: true, data: analysis.repositories }); }
export async function retry(req,res) { res.status(202).json({ success: true, data: await service.retryAnalysis(req.params.id,token(req)) }); }
export async function reanalyze(req,res) { res.status(202).json({ success: true, data: await service.reanalyze(req.params.id,token(req)) }); }
export async function diff(req,res) {
  const analysis = await service.getAnalysis(req.params.id, token(req));
  res.json({ success: true, data: analysis.diff || null });
}
export async function share(req,res) {
  const result = await service.toggleShare(req.params.id, req.body.isPublic, token(req));
  res.json({ success: true, data: result });
}
export async function getShared(req,res) {
  const profile = await service.getSharedProfile(req.params.shareId);
  res.json({ success: true, data: profile });
}
export async function auditExport(req,res) {
  const exportData = await service.generateAuditExport(req.params.id, token(req));
  res.json({ success: true, data: exportData });
}
export async function remove(req,res) { await service.removeAnalysis(req.params.id,token(req)); res.json({ success: true, data: { deleted: true } }); }


