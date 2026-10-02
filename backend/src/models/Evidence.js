import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis', required: true, index: true },
  deterministicId: { type: String, required: true, index: true },
  repo: { type: String, required: true },
  kind: { type: String, required: true },
  skillId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  path: { type: String, default: null },
  note: { type: String, default: null },
  meta: { type: Schema.Types.Mixed, default: {} },
  weight: { type: Number, default: 1.0 },
  flagged: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ analysisId: 1, deterministicId: 1 }, { unique: true });

export const Evidence = mongoose.model('Evidence', schema);
