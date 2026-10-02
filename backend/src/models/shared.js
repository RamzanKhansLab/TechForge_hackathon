import { Schema } from 'mongoose';

export const evidenceSchema = new Schema({
  deterministicId: String,
  skill: String,
  skillId: String,
  type: String,
  repository: String,
  repo: String,
  file: String,
  path: String,
  description: String,
  note: String,
  url: String,
  date: Date,
  weight: { type: Number, default: 1.0 },
  flagged: { type: Boolean, default: false },
  strength: { type: String, enum: ['direct', 'supporting'] },
}, { _id: false });
export const skillSchema = new Schema({
  id: String, name: String, label: String, category: String, claimed: Schema.Types.Mixed,
  status: { type: String, enum: ['Proven', 'Partial', 'Claimed-only'] },
  verdict: { type: String, enum: ['Proven', 'Partial', 'Claimed-only'] },
  score: Number, reasons: [String], repositories: [String], evidence: [evidenceSchema],
  breakdown: Schema.Types.Mixed,
  breakdownMax: Schema.Types.Mixed,
  breakdownList: [{ _id: false, rule: String, points: Number, description: String }],
  trustFlags: [{ _id: false, code: String, severity: String, repo: String, explanation: String }],
  firstSeen: Date, lastSeen: Date, activityByMonth: Schema.Types.Mixed, impliedBy: [String],
}, { _id: false });
export const taskSchema = new Schema({
  skill: String, title: String, description: String, difficulty: String, estimatedTime: String,
  expectedOutput: [String], status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
}, { _id: false });
