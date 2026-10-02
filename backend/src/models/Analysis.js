import mongoose, { Schema } from 'mongoose';
import { skillSchema, evidenceSchema } from './shared.js';
const repositorySchema = new Schema({
  name: String, fullName: String, url: String, description: String, defaultBranch: String,
  stars: Number, updatedAt: Date, languages: { type: Map, of: Number },
  commitCount: Number, commitCountIsSample: Boolean, latestCommit: Date, firstCommit: Date,
  commitsLast30Days: Number, commitsLast90Days: Number, commits: [{ _id: false, sha: String, url: String, date: Date, message: String }],
  testingDetected: Boolean, testingFramework: [String], testEvidence: [String],
  deploymentDetected: Boolean, deploymentPlatform: [String], deploymentEvidence: [String],
  readme: { description: String, setupInstructions: Boolean, deploymentLinks: [String] },
  filesInspected: [String], evidence: [evidenceSchema], warnings: [String],
}, { _id: false });
const schema = new Schema({
  accessTokenHash: { type: String, required: true, select: false },
  githubUsername: { type: String, required: true, maxlength: 39 },
  candidate: { name: String, email: String, phone: String },
  resume: {
    filename: String, pages: Number,
    asset: { public_id: String, secure_url: String, resource_type: String, type: String, format: String, bytes: Number },
    skills: [String], categories: { type: Map, of: [String] }, projects: [String], experience: [String], education: [String], certifications: [String],
  },
  github: { login: String, name: String, avatarUrl: String, url: String, bio: String, publicRepos: Number, followers: Number },
  repositories: [repositorySchema], skills: [skillSchema], warnings: [String],
  summary: { claimed: Number, proven: Number, partial: Number, claimedOnly: Number, repositoriesAnalyzed: Number, discovered: Number },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', required: true },
  stage: { type: String, default: 'queued' }, progress: { type: Number, default: 0 },
  error: { code: String, message: String }, scoringVersion: String,
  attempts: { type: Number, default: 0 }, leaseOwner: String, leaseUntil: Date,
  completedAt: Date,
}, { timestamps: true });
schema.index({ status: 1, leaseUntil: 1, createdAt: 1 });
schema.index({ githubUsername: 1, createdAt: -1 });
export const Analysis = mongoose.model('Analysis', schema);
