import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  reportId: { type: Schema.Types.ObjectId, ref: 'Analysis', required: true, index: true },
  shareTokenId: { type: String, required: true, index: true },
  recruiterUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recruiterOrg: { type: String, required: true, maxlength: 120 },
  openedAt: { type: Date, default: Date.now, required: true },
  action: { type: String, enum: ['view', 'match', 'compare'], required: true }
}, { timestamps: true });

schema.index({ reportId: 1, recruiterUserId: 1, action: 1, openedAt: -1 });
export const ShareAccessLog = mongoose.model('ShareAccessLog', schema);
