import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Analysis } from '../src/models/Analysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { Evidence } from '../src/models/Evidence.js';

await connectDatabase();
const legacyFilter = { ownerUserId: null };
const update = { $set: { legacy: true } };
const [analyses, jobs, evidence] = await Promise.all([
  Analysis.updateMany(legacyFilter, update),
  JobAnalysis.updateMany(legacyFilter, update),
  Evidence.updateMany(legacyFilter, update)
]);
console.log(JSON.stringify({ analyses: analyses.modifiedCount, jobs: jobs.modifiedCount, evidence: evidence.modifiedCount }));
await mongoose.disconnect();
