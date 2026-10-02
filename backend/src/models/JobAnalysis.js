import mongoose, { Schema } from 'mongoose';
import { evidenceSchema, taskSchema } from './shared.js';
const schema = new Schema({
  accessTokenHash: { type: String, required: true, select: false },
  analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis', default: null },
  title: { type: String, maxlength: 120 }, jobDescription: { type: String, required: true, maxlength: 20000 },
  requiredSkills: [String], preferredSkills: [String], categories: { type: Map, of: [String] },
  matches: [{ _id: false, skill: String, name: String, candidateStatus: String, score: Number, state: { type: String, enum: ['Verified', 'Partial', 'Gap'] }, evidence: [evidenceSchema], reason: String }],
  coverage: { type: Number, default: null },
  summary: { verified: Number, partial: Number, gaps: Number, required: Number },
  microTasks: [taskSchema], warnings: [String],
}, { timestamps: true });
schema.index({ analysisId: 1, createdAt: -1 });
export const JobAnalysis = mongoose.model('JobAnalysis', schema);
