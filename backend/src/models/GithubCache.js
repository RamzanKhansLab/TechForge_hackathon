import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  etag: { type: String, default: null },
  data: { type: Schema.Types.Mixed, required: true },
  status: { type: Number, default: 200 },
  expiresAt: { type: Date, required: true, index: { expires: '6h' } },
}, { timestamps: true });

export const GithubCache = mongoose.model('GithubCache', schema);
