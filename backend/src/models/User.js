import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 180,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'recruiter'],
    required: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 80,
    trim: true
  },
  orgName: {
    type: String,
    default: null,
    maxlength: 120,
    trim: true
  },
  failedLogins: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

schema.methods.isLocked = function() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

export const User = mongoose.model('User', schema);
