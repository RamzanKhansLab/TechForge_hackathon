/**
 * controllers/coach.controller.js
 * Thin controllers for /api/reports/:id/* routes (Coach lens).
 * All heavy lifting is in services/coach/*.
 */
import { Analysis } from '../models/Analysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { AppError } from '../utils/AppError.js';
import { forUser, requireOwned } from '../services/ownership.service.js';
import { buildReadiness } from '../services/coach/readiness.service.js';
import { buildRoadmap } from '../services/coach/roadmap.service.js';
import { buildResumeFixes } from '../services/coach/resumeFixes.service.js';
import { runTaskCheck } from '../services/coach/taskCheck.service.js';
import { buildRoleCompare } from '../services/coach/roleCompare.service.js';

async function getCompleted(id, userId) {
  const analysis = await requireOwned(forUser(userId).analyses.findById(id));
  if (analysis.status !== 'completed') {
    throw new AppError(409, 'ANALYSIS_NOT_READY', 'Analysis must be completed before accessing coach features.');
  }
  return analysis;
}

async function getTargetRoles(analysis, userId) {
  return JobAnalysis.find({
    analysisId: analysis._id,
    ownerUserId: userId,
    legacy: false,
    isTargetRole: true,
  }).select('-accessTokenHash').lean();
}

// GET /api/reports/:id/readiness
export async function readiness(req, res) {
  const analysis = await getCompleted(req.params.id, req.user._id);
  const savedRoles = await getTargetRoles(analysis, req.user._id);
  res.json({ success: true, data: buildReadiness(analysis.toObject({ flattenMaps: true }), savedRoles) });
}

// GET /api/reports/:id/roadmap?hoursPerWeek=6&roleId=optional
export async function roadmap(req, res) {
  const analysis = await getCompleted(req.params.id, req.user._id);
  const savedRoles = await getTargetRoles(analysis, req.user._id);
  const hoursPerWeek = Math.max(1, Math.min(168, Number(req.query.hoursPerWeek) || 6));
  const roleId = req.query.roleId ?? null;
  res.json({
    success: true,
    data: buildRoadmap(analysis.toObject({ flattenMaps: true }), savedRoles, hoursPerWeek, roleId),
  });
}

// GET /api/reports/:id/resume-fixes
export async function resumeFixes(req, res) {
  const analysis = await getCompleted(req.params.id, req.user._id);
  res.json({ success: true, data: buildResumeFixes(analysis.toObject({ flattenMaps: true })) });
}

// POST /api/reports/:id/tasks/:taskId/check
export async function taskCheck(req, res) {
  const data = await runTaskCheck(req.params.id, req.params.taskId, req.user._id);
  res.json({ success: true, data });
}

// PATCH /api/jobs/:id/target  { isTargetRole, roleTitle }
export async function tagRole(req, res) {
  const job = await requireOwned(forUser(req.user._id).jobs.findById(req.params.id));

  const isTargetRole = Boolean(req.body.isTargetRole);
  const roleTitle = typeof req.body.roleTitle === 'string'
    ? req.body.roleTitle.slice(0, 120)
    : (job.title ?? null);

  // Enforce max 10 target roles per analysis
  if (isTargetRole && job.analysisId) {
    const count = await JobAnalysis.countDocuments({
      analysisId: job.analysisId,
      ownerUserId: req.user._id,
      legacy: false,
      isTargetRole: true,
      _id: { $ne: job._id },
    });
    if (count >= 10) {
      throw new AppError(409, 'TARGET_ROLES_LIMIT', 'You can save a maximum of 10 target roles per report. Remove one first.');
    }
  }

  const updated = await JobAnalysis.findOneAndUpdate(
    { _id: req.params.id, ownerUserId: req.user._id, legacy: false },
    { $set: { isTargetRole, roleTitle, taggedAt: isTargetRole ? new Date() : null } },
    { new: true, select: '-accessTokenHash' }
  );
  res.json({ success: true, data: { isTargetRole: updated.isTargetRole, roleTitle: updated.roleTitle, taggedAt: updated.taggedAt } });
}

// GET /api/reports/:id/roles/compare
export async function rolesCompare(req, res) {
  const analysis = await getCompleted(req.params.id, req.user._id);
  const savedRoles = await getTargetRoles(analysis, req.user._id);
  res.json({
    success: true,
    data: buildRoleCompare(savedRoles, analysis.toObject({ flattenMaps: true }).skills ?? []),
  });
}
