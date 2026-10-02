import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  familyId: {
    type: String,
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    default: null,
    maxlength: 256
  },
  ip: {
    type: String,
    default: null,
    maxlength: 45
  },
  revokedAt: {
    type: Date,
    default: null
  },
  replacedBy: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// TTL index to automatically purge expired tokens from MongoDB
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', schema);
