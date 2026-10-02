import mongoose, { Schema } from 'mongoose';
import { skillSchema, evidenceSchema } from './shared.js';

// Use a subdocument so Cloudinary's `type` field is stored as metadata,
// rather than interpreted as the Mongoose type of the entire asset object.
const resumeAssetSchema = new Schema({
  public_id: { type: String, required: true },
  secure_url: { type: String, required: true },
  resource_type: { type: String, enum: ['raw'], required: true },
  type: { type: String, enum: ['authenticated'], required: true },
  format: { type: String, enum: ['pdf'], required: true },
  bytes: { type: Number, min: 0, required: true },
}, { _id: false });

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
  reportId: { type: Schema.Types.ObjectId, ref: 'Analysis', default: function() { return this._id; }, index: true },
  accessTokenHash: { type: String, required: true, select: false },
  githubUsername: { type: String, required: true, maxlength: 39 },
  candidate: { name: String, email: String, phone: String },
  resume: {
    filename: String, pages: Number,
    asset: { type: resumeAssetSchema, required: true },
    skills: [String], detailedSkills: [Schema.Types.Mixed], categories: { type: Map, of: [String] }, projects: [String], experience: [String], education: [String], certifications: [String],
  },
  github: { login: String, name: String, avatarUrl: String, url: String, bio: String, publicRepos: Number, followers: Number },
  repositories: [repositorySchema], skills: [skillSchema], warnings: [String],
  summary: { claimed: Number, proven: Number, partial: Number, claimedOnly: Number, repositoriesAnalyzed: Number, discovered: Number, coveragePercentage: Number, trustNote: String },
  events: [{
    _id: false,
    name: { type: String, required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    detail: { type: String, required: true },
    counts: { type: Schema.Types.Mixed, default: {} }
  }],
  partialEvidence: { type: Boolean, default: false },
  partialEvidenceReason: { type: String, default: null },
  rateLimitResetAt: { type: Date, default: null },
  discrepancyReport: [{
    _id: false,
    type: { type: String, required: true },
    skillId: { type: String, default: null },
    severity: { type: String, enum: ['low', 'medium', 'high', 'positive'], required: true },
    message: { type: String, required: true },
    evidenceLinks: [String]
  }],
  requestBudget: {
    totalUsed: { type: Number, default: 0 },
    remaining: { type: Number, default: 120 }
  },
  previousAnalysisId: { type: Schema.Types.ObjectId, ref: 'Analysis', default: null },
  diff: { type: Schema.Types.Mixed, default: null },
  isPublic: { type: Boolean, default: false },
  shareId: { type: String, default: null, index: true },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', required: true },
  stage: { type: String, default: 'queued' }, progress: { type: Number, default: 0 },
  error: { code: String, message: String }, scoringVersion: String,

  attempts: { type: Number, default: 0 }, leaseOwner: String, leaseUntil: Date,
  completedAt: Date,
}, { timestamps: true });
schema.index({ status: 1, leaseUntil: 1, createdAt: 1 });
schema.index({ githubUsername: 1, createdAt: -1 });
schema.index({ reportId: 1, createdAt: -1 });
schema.index({ previousAnalysisId: 1 });
export const Analysis = mongoose.model('Analysis', schema);
