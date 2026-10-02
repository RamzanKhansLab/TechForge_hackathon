import { JobAnalysis } from '../../models/JobAnalysis.js';
import { getAnalysis } from '../analysis/analysis.service.js';
import { extractJobSkills } from './jobExtractor.js';
import { matchSkills } from './matching.service.js';
import { newAccess, publicDocument } from '../../utils/access.js';
import { AppError } from '../../utils/AppError.js';
import { forUser, requireOwned } from '../ownership.service.js';
export async function analyzeJob(input, ownerUserId) {
  const candidate = input.analysisId ? await getAnalysis(input.analysisId, ownerUserId) : null;
  if (candidate && candidate.status !== 'completed') throw new AppError(409, 'ANALYSIS_NOT_READY', 'Wait for candidate analysis to complete before matching.');
  const extracted = extractJobSkills(input.jobDescription);
  const matching = candidate ? matchSkills(extracted.requiredSkills, candidate.skills) : { matches: [], coverage: null, microTasks: [], summary: { required: extracted.requiredSkills.length, verified: 0, partial: 0, gaps: 0 } };
  const { accessTokenHash } = newAccess();
  const warnings = ['Skills are extracted by dictionary and section heuristics. Review the identified requirements.'];
  if (!extracted.requiredSkills.length) warnings.push('No required dictionary skills were found; coverage is unavailable. Preferred skills do not affect coverage.');
  const job = await JobAnalysis.create({ ownerUserId, ...input, title: input.title || input.jobDescription.split('\n')[0].slice(0,120), ...extracted, ...matching, accessTokenHash, warnings });
  return publicDocument(job);
}
export async function getJob(id, ownerUserId) { return requireOwned(forUser(ownerUserId).jobs.findById(id)); }
export async function updateTask(id, skill, status, ownerUserId) {
  const job = await getJob(id, ownerUserId);
  const task = job.microTasks.find(item => item.skill === skill);
  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'This micro-task was not found.');
  const updated = await JobAnalysis.findOneAndUpdate({ _id: id, ownerUserId, legacy: false, 'microTasks.skill': skill }, { $set: { 'microTasks.$.status': status } }, { new: true });
  if (!updated) throw new AppError(404, 'TASK_NOT_FOUND', 'This micro-task was removed.');
  return publicDocument(updated);
}
