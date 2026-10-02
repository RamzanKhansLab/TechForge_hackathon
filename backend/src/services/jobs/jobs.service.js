import { JobAnalysis } from '../../models/JobAnalysis.js';
import { getAnalysis } from '../analysis/analysis.service.js';
import { extractJobSkills } from './jobExtractor.js';
import { matchSkills } from './matching.service.js';
import { authorize, newAccess, publicDocument } from '../../utils/access.js';
import { AppError } from '../../utils/AppError.js';
export async function analyzeJob(input, token) {
  const candidate = input.analysisId ? await getAnalysis(input.analysisId, token) : null;
  if (candidate && candidate.status !== 'completed') throw new AppError(409, 'ANALYSIS_NOT_READY', 'Wait for candidate analysis to complete before matching.');
  const extracted = extractJobSkills(input.jobDescription);
  const matching = candidate ? matchSkills(extracted.requiredSkills, candidate.skills) : { matches: [], coverage: null, microTasks: [], summary: { required: extracted.requiredSkills.length, verified: 0, partial: 0, gaps: 0 } };
  const { accessToken, accessTokenHash } = newAccess();
  const warnings = ['Skills are extracted by dictionary and section heuristics. Review the identified requirements.'];
  if (!extracted.requiredSkills.length) warnings.push('No required dictionary skills were found; coverage is unavailable. Preferred skills do not affect coverage.');
  const job = await JobAnalysis.create({ ...input, title: input.title || input.jobDescription.split('\n')[0].slice(0,120), ...extracted, ...matching, accessTokenHash, warnings });
  return { ...publicDocument(job), accessToken };
}
export async function getJob(id, token) { return authorize(await JobAnalysis.findById(id).select('+accessTokenHash'), token); }
export async function updateTask(id, skill, status, token) {
  const job = await getJob(id, token);
  const task = job.microTasks.find(item => item.skill === skill);
  if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'This micro-task was not found.');
  task.status = status;
  await job.save(); return publicDocument(job);
}
