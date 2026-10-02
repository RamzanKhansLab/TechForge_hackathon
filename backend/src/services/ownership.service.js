import { Analysis } from '../models/Analysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { Evidence } from '../models/Evidence.js';
import { AppError } from '../utils/AppError.js';

const owned = (model, userId) => ({
  findById: id => model.findOne({ _id: id, ownerUserId: userId, legacy: false }),
  find: filter => model.find({ ...filter, ownerUserId: userId, legacy: false }),
  findOne: filter => model.findOne({ ...filter, ownerUserId: userId, legacy: false })
});

export const forUser = userId => ({
  analyses: owned(Analysis, userId),
  jobs: owned(JobAnalysis, userId),
  evidence: owned(Evidence, userId)
});

export async function requireOwned(query) {
  const document = await query;
  if (!document) throw new AppError(404, 'NOT_FOUND', 'This record could not be found.');
  return document;
}
