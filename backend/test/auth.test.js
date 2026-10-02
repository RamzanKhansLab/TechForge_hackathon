import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { Analysis } from '../src/models/Analysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { Evidence } from '../src/models/Evidence.js';
import { hashPassword, validatePasswordPolicy } from '../src/utils/auth.js';

const origin = 'http://localhost:5173';
let mongo;
const resumeAsset = {
  public_id: 'test/no-remote-delete.pdf',
  secure_url: 'https://example.test/resume.pdf',
  resource_type: 'raw',
  type: 'authenticated',
  format: 'pdf',
  bytes: 1
};
function csrf(agent) {
  return agent.get('/api/auth/csrf').expect(200).then(response => response.body.data.csrfToken);
}

function csrfHeaders(token) {
  return { Origin: origin, 'X-SP-CSRF': token };
}

function cookieValue(response, name) {
  const raw = response.headers['set-cookie']?.find(cookie => cookie.startsWith(`${name}=`));
  return raw?.split(';', 1)[0];
}

async function register(agent, values = {}) {
  const token = await csrf(agent);
  return agent.post('/api/auth/register').set(csrfHeaders(token)).send({
    email: 'student@example.test',
    password: 'CorrectHorseBatteryStaple99!',
    displayName: 'Test Student',
    role: 'student',
    ...values
  });
}

describe('Phase A1 authentication', { concurrency: false, timeout: 60000 }, () => {
  before(async () => {
    mongo = await MongoMemoryServer.create({
      binary: { downloadDir: path.join(process.cwd(), '.cache', 'mongodb-binaries') }
    });
    await mongoose.connect(mongo.getUri());
  }, { timeout: 60000 });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      RefreshToken.deleteMany({}),
      Analysis.deleteMany({}),
      JobAnalysis.deleteMany({}),
      Evidence.deleteMany({})
    ]);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('bootstraps CSRF and rejects missing CSRF on registration', async () => {
    const agent = request.agent(app);
    const bootstrap = await agent.get('/api/auth/csrf').expect(200);
    assert.ok(bootstrap.body.data.csrfToken);
    assert.match(bootstrap.headers['set-cookie'].join(';'), /sp_csrf=/);

    const rejected = await agent.post('/api/auth/register').set('Origin', origin).send({
      email: 'student@example.test', password: 'CorrectHorseBatteryStaple99!', displayName: 'Test Student', role: 'student'
    }).expect(403);
    assert.equal(rejected.body.error.code, 'CSRF_TOKEN_INVALID');
  });

  it('registers, logs in with generic failures, and exposes the authenticated user', async () => {
    const agent = request.agent(app);
    const created = await register(agent);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.user.role, 'student');
    assert.equal((await agent.get('/api/auth/me').expect(200)).body.data.user.email, 'student@example.test');

    const loginToken = await csrf(agent);
    const missing = await agent.post('/api/auth/login').set(csrfHeaders(loginToken)).send({
      email: 'missing@example.test', password: 'wrong-password'
    }).expect(401);
    const incorrect = await agent.post('/api/auth/login').set(csrfHeaders(loginToken)).send({
      email: 'student@example.test', password: 'wrong-password'
    }).expect(401);
    assert.equal(missing.body.error.message, 'Email or password is incorrect.');
    assert.equal(incorrect.body.error.message, 'Email or password is incorrect.');
  });

  it('rotates refresh tokens, detects reuse, and revokes the family', async () => {
    const agent = request.agent(app);
    const created = await register(agent);
    assert.equal(created.status, 201);
    const initialRefresh = cookieValue(created, 'sp_refresh');
    const refreshed = await agent.post('/api/auth/refresh')
      .set(csrfHeaders(created.body.data.csrfToken)).expect(200);
    const reused = await request(app).post('/api/auth/refresh')
      .set(csrfHeaders(refreshed.body.data.csrfToken))
      .set('Cookie', [initialRefresh, `sp_csrf=${refreshed.body.data.csrfToken}`])
      .expect(401);

    assert.equal(reused.body.error.code, 'REFRESH_TOKEN_REUSED');
    assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 0);
  });

  it('returns lockout metadata after eight failed attempts', async () => {
    const user = await User.create({
      email: 'locked@example.test', passwordHash: await hashPassword('CorrectHorseBatteryStaple99!'), displayName: 'Locked User', role: 'student',
      failedLogins: 7
    });
    const agent = request.agent(app);
    const token = await csrf(agent);
    await agent.post('/api/auth/login').set(csrfHeaders(token)).send({
      email: user.email, password: 'WrongPassword123!'
    }).expect(401);
    const response = await agent.post('/api/auth/login').set(csrfHeaders(token)).send({
      email: user.email, password: 'WrongPassword123!'
    }).expect(423);

    assert.equal(response.body.error.code, 'ACCOUNT_LOCKED');
    assert.ok(response.body.error.details.retryAfter > 0);
    assert.ok(Number(response.headers['retry-after']) > 0);
  });

  it('logs out its current refresh-token family', async () => {
    const agent = request.agent(app);
    const created = await register(agent);
    assert.equal(created.status, 201);
    await agent.post('/api/auth/logout').set(csrfHeaders(created.body.data.csrfToken)).expect(200);
    assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 0);
    await agent.get('/api/auth/me').expect(401);
  });

  it('deletes only the account owner records and returns deletion counts', async () => {
    const originalDestroy = cloudinary.uploader.destroy;
    const deletedAssets = [];
    cloudinary.uploader.destroy = async publicId => {
      deletedAssets.push(publicId);
      return { result: 'ok' };
    };
    const agent = request.agent(app);
    const created = await register(agent);
    assert.equal(created.status, 201);
    const owner = await User.findOne({ email: 'student@example.test' });
    const other = await User.create({
      email: 'other@example.test', passwordHash: await hashPassword('CorrectHorseBatteryStaple99!'), displayName: 'Other Student', role: 'student'
    });
    const analysisId = new mongoose.Types.ObjectId();
    await Analysis.collection.insertMany([
      { _id: analysisId, ownerUserId: owner._id, githubUsername: 'owner', accessTokenHash: 'a'.repeat(64), resume: { asset: resumeAsset }, isPublic: true, shareId: 'owner-share' },
      { _id: new mongoose.Types.ObjectId(), ownerUserId: owner._id, githubUsername: 'owner-history', accessTokenHash: 'b'.repeat(64), resume: { asset: resumeAsset }, previousAnalysisId: analysisId },
      { _id: new mongoose.Types.ObjectId(), ownerUserId: other._id, githubUsername: 'other', accessTokenHash: 'c'.repeat(64) }
    ]);
    await JobAnalysis.collection.insertMany([
      { _id: new mongoose.Types.ObjectId(), ownerUserId: owner._id, analysisId, accessTokenHash: 'd'.repeat(64), jobDescription: 'A valid job description for owner cleanup.' },
      { _id: new mongoose.Types.ObjectId(), ownerUserId: other._id, accessTokenHash: 'e'.repeat(64), jobDescription: 'A valid job description for the other account.' }
    ]);
    await Evidence.collection.insertOne({ _id: new mongoose.Types.ObjectId(), ownerUserId: owner._id, analysisId, deterministicId: 'owner-evidence', repo: 'owner/repo', kind: 'manifest', skillId: 'node', url: 'https://example.test/evidence' });

    let deleted;
    try {
      deleted = await agent.delete('/api/auth/account').set(csrfHeaders(created.body.data.csrfToken))
        .send({ password: 'CorrectHorseBatteryStaple99!' }).expect(200);
    } finally {
      cloudinary.uploader.destroy = originalDestroy;
    }

    assert.equal(deleted.body.data.deleted.analyses, 2);
    assert.equal(deleted.body.data.deleted.jobs, 1);
    assert.equal(deleted.body.data.deleted.evidence, 1);
    assert.equal(deleted.body.data.deleted.shareRecords, 1);
    assert.equal(deleted.body.data.deleted.cloudinaryPdfs, 2);
    assert.equal(deletedAssets.length, 2);
    assert.equal(await Analysis.countDocuments({ ownerUserId: owner._id }), 0);
    assert.equal(await JobAnalysis.countDocuments({ ownerUserId: owner._id }), 0);
    assert.equal(await Evidence.countDocuments({ ownerUserId: owner._id }), 0);
    assert.equal(await User.countDocuments({ _id: owner._id }), 0);
    assert.equal(await Analysis.countDocuments({ ownerUserId: other._id }), 1);
    assert.equal(await JobAnalysis.countDocuments({ ownerUserId: other._id }), 1);
  });

  it('uses owner fields with safe legacy defaults and limits comparison to four profiles', async () => {
    assert.equal(Analysis.schema.path('ownerUserId').options.default, null);
    assert.equal(Analysis.schema.path('legacy').options.default, false);

    // Unauthenticated request must be rejected before validation runs
    const unauthed = await request(app).post('/api/public/compare')
      .set('Origin', origin)
      .send({ jdText: 'A valid job description that is long enough for validation.', tokens: ['one', 'two', 'three', 'four', 'five'] })
      .expect(401);
    assert.equal(unauthed.body.error.code, 'UNAUTHORIZED');

    // Authenticated recruiter: 5 tokens → validation fires and returns 400
    // Create directly to avoid the register rate limiter (5/hr) exhausted by prior tests
    const { hashPassword: hp } = await import('../src/utils/auth.js');
    const { User: UserModel } = await import('../src/models/User.js');
    await UserModel.create({ email: 'recruiter@example.test', passwordHash: await hp('CorrectHorseBatteryStaple99!'), displayName: 'Test Recruiter', role: 'recruiter', orgName: 'AcmeCorp' });
    const recruiterAgent = request.agent(app);
    const loginToken = await csrf(recruiterAgent);
    const recruiterLogin = await recruiterAgent.post('/api/auth/login')
      .set(csrfHeaders(loginToken))
      .send({ email: 'recruiter@example.test', password: 'CorrectHorseBatteryStaple99!' })
      .expect(200);
    const recruiterCsrf = recruiterLogin.body.data.csrfToken;
    const response = await recruiterAgent.post('/api/public/compare')
      .set({ Origin: origin, 'X-SP-CSRF': recruiterCsrf })
      .send({ jdText: 'A valid job description that is long enough for validation.', tokens: ['one', 'two', 'three', 'four', 'five'] })
      .expect(400);
    assert.equal(response.body.error.code, 'INVALID_TOKENS');
  });

  it('enforces the password policy before persistence', () => {
    assert.equal(validatePasswordPolicy('password123').valid, false);
    assert.equal(validatePasswordPolicy('CorrectHorseBatteryStaple99!').valid, true);
  });
});
