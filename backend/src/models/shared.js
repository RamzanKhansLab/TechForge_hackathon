import { Schema } from 'mongoose';
export const evidenceSchema = new Schema({
  skill: String, type: String, repository: String, file: String, description: String,
  url: String, date: Date, strength: { type: String, enum: ['direct', 'supporting'] },
}, { _id: false });
export const skillSchema = new Schema({
  id: String, name: String, category: String, claimed: Boolean,
  status: { type: String, enum: ['Proven', 'Partial', 'Claimed-only'] },
  score: Number, reasons: [String], repositories: [String], evidence: [evidenceSchema],
  breakdown: [{ _id: false, rule: String, points: Number }],
}, { _id: false });
export const taskSchema = new Schema({
  skill: String, title: String, description: String, difficulty: String, estimatedTime: String,
  expectedOutput: [String], status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
}, { _id: false });
