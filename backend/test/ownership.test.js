/**
 * test/ownership.test.js
 * Phase A2 – Ownership + role isolation integration tests.
 *
 * Matrix tested:
 *  S1  Student routes (/analysis, /reports, /jobs) require auth + student role.
 *  S2  A student cannot see another student's analysis (404, not 403).
 *  R1  Recruiter routes (/public, /recruiter) require auth + recruiter role.
 *  R2  Recruiter cannot hit student routes.
 *  X1  Unauthenticated requests are rejected with 401 on all protected routes.
 *  X2  /demo/:id bypass is still open (read-only demo, no token needed).
 *
 * Run with: node --test test/ownership.test.js
 */
import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { Analysis } from '../src/models/Analysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { Evidence } from '../src/models/Evidence.js';
import { ShareAccessLog } from '../src/models/ShareAccessLog.js';
import { hashPassword } from '../src/utils/auth.js';

const ORIGIN = 'http://localhost:5173';

const resumeAsset = {
  public_id: 'test/ownership.pdf',
  secure_url: 'https://example.test/resume.pdf',
  resource_type: 'raw',
  type: 'authenticated',
  format: 'pdf',
  bytes: 1
};

function csrfHeaders(token) {
  return { Origin: ORIGIN, 'X-SP-CSRF': token };
}

async function getCsrf(agent) {
  const res = await agent.get('/api/auth/csrf').expect(200);
  return res.body.data.csrfToken;
}

async function registerAndLogin(agent, overrides = {}) {
  const defaults = {
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
    password: 'CorrectHorseBatteryStaple99!',
    displayName: 'Test User',
    role: 'student'
  };
  const body = { ...defaults, ...overrides };
  const token = await getCsrf(agent);
  const res = await agent.post('/api/auth/register')
    .set(csrfHeaders(token))
    .send(body)
    .expect(201);
  return { csrfToken: res.body.data.csrfToken, email: body.email };
}

async function makeAnalysis(ownerUser, overrides = {}) {
  return Analysis.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    ownerUserId: ownerUser._id,
    legacy: false,
    githubUsername: 'octocat',
    accessTokenHash: 'a'.repeat(64),
    resume: { asset: resumeAsset, filename: 'cv.pdf', pages: 1, skills: [], categories: {} },
    status: 'completed',
    stage: 'done',
    progress: 100,
    skills: [],
    summary: { claimed: 0, proven: 0, partial: 0, claimedOnly: 0 },
    ...overrides
  });
}

let mongo;

describe('Phase A2 ownership & role isolation', { concurrency: false, timeout: 60000 }, () => {
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
      Evidence.deleteMany({}),
      ShareAccessLog.deleteMany({})
    ]);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('X1 - unauthenticated requests receive 401 on all protected routes', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const routes = [
      ['GET',    `/api/analysis/${fakeId}`],
      ['GET',    `/api/reports/${fakeId}/readiness`],
      ['GET',    `/api/reports/${fakeId}/roadmap`],
      ['GET',    `/api/jobs/${fakeId}`],
      ['GET',    `/api/public/some-token`],
      ['GET',    `/api/recruiter/opened`],
      ['GET',    `/api/auth/me`],
    ];
    for (const [method, url] of routes) {
      const res = await request(app)[method.toLowerCase()](url);
      assert.equal(res.status, 401, `Expected 401 on ${method} ${url}, got ${res.status}`);
      assert.equal(res.body.error.code, 'UNAUTHORIZED', `Expected UNAUTHORIZED on ${method} ${url}`);
    }
  });

  it('S1 - student can read their own analysis', async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent);
    const owner = await User.findOne({});
    const { insertedId } = await makeAnalysis(owner);
    const res = await agent.get(`/api/analysis/${insertedId}`).expect(200);
    assert.equal(res.body.success, true);
    assert.equal(String(res.body.data._id), String(insertedId));
    assert.equal(res.body.data.accessTokenHash, undefined);
  });

  it('S2 - student receives 404 for another students analysis', async () => {
    const ownerPassword = await hashPassword('CorrectHorseBatteryStaple99!');
    const owner = await User.create({ email: 'owner@example.test', passwordHash: ownerPassword, displayName: 'Owner', role: 'student' });
    const { insertedId } = await makeAnalysis(owner);
    const agent = request.agent(app);
    await registerAndLogin(agent);
    await agent.get(`/api/analysis/${insertedId}`).expect(404);
  });

  it('R2 - recruiter receives 403 on student-only analysis routes', async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, { role: 'recruiter', orgName: 'AcmeCorp' });
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const studentRoutes = [
      ['GET', `/api/analysis/${fakeId}`],
      ['GET', `/api/reports/${fakeId}/readiness`],
      ['GET', `/api/reports/${fakeId}/roadmap`],
    ];
    for (const [method, url] of studentRoutes) {
      const res = await agent[method.toLowerCase()](url);
      assert.equal(res.status, 403, `Expected 403 on ${method} ${url}, got ${res.status}`);
      assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
    }
  });

  it('R1 - student receives 403 on recruiter-only routes', async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent, { role: 'student' });
    const recruiterRoutes = [
      ['GET', '/api/public/some-share-token'],
      ['GET', '/api/recruiter/opened'],
    ];
    for (const [method, url] of recruiterRoutes) {
      const res = await agent[method.toLowerCase()](url);
      assert.equal(res.status, 403, `Expected 403 on ${method} ${url}, got ${res.status}`);
      assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
    }
  });

  it('R1+ - recruiter can view a shared profile and access log records org but not email', async () => {
    const studentPw = await hashPassword('CorrectHorseBatteryStaple99!');
    const student = await User.create({ email: 'student@example.test', passwordHash: studentPw, displayName: 'Student', role: 'student' });
    await makeAnalysis(student, { isPublic: true, shareId: 'tok-abc123', githubUsername: 'shared-user' });

    const agent = request.agent(app);
    await registerAndLogin(agent, { role: 'recruiter', orgName: 'AcmeCorp' });
    const res = await agent.get('/api/public/tok-abc123').expect(200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.handle);
    assert.equal(res.body.data.email, undefined);
    assert.equal(res.body.data.phone, undefined);

    const recruiter = await User.findOne({ role: 'recruiter' });
    const logs = await ShareAccessLog.find({ recruiterUserId: recruiter._id });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'view');
    assert.equal(logs[0].recruiterOrg, 'AcmeCorp');
    assert.equal(logs[0].recruiterEmail, undefined);
  });

  it('access log deduplication - two views within 30 min produce one log entry', async () => {
    const studentPw = await hashPassword('CorrectHorseBatteryStaple99!');
    const student = await User.create({ email: 'student2@example.test', passwordHash: studentPw, displayName: 'Student2', role: 'student' });
    await makeAnalysis(student, { isPublic: true, shareId: 'tok-dedup', githubUsername: 'dedup-user' });

    // Create recruiter directly to avoid hitting the register rate limiter
    const recPw = await hashPassword('CorrectHorseBatteryStaple99!');
    await User.create({ email: 'dedup-rec@example.test', passwordHash: recPw, displayName: 'DedupRec', role: 'recruiter', orgName: 'DeduCorp' });

    const agent = request.agent(app);
    const loginCsrf = await getCsrf(agent);
    await agent.post('/api/auth/login').set(csrfHeaders(loginCsrf)).send({ email: 'dedup-rec@example.test', password: 'CorrectHorseBatteryStaple99!' }).expect(200);
    await agent.get('/api/public/tok-dedup').expect(200);
    await agent.get('/api/public/tok-dedup').expect(200);

    const recruiter = await User.findOne({ role: 'recruiter' });
    const count = await ShareAccessLog.countDocuments({ recruiterUserId: recruiter._id, action: 'view' });
    assert.equal(count, 1, 'Two views within 30 min should produce exactly one log entry');
  });

  it('share access log - owner sees their log; non-owner gets 404', async () => {
    const ownerPw = await hashPassword('CorrectHorseBatteryStaple99!');
    const owner = await User.create({ email: 'log-owner@example.test', passwordHash: ownerPw, displayName: 'LogOwner', role: 'student' });
    const { insertedId } = await makeAnalysis(owner, { isPublic: true, shareId: 'tok-log-test' });
    const recPw = await hashPassword('CorrectHorseBatteryStaple99!');
    const rec = await User.create({ email: 'rec@example.test', passwordHash: recPw, displayName: 'Rec', role: 'recruiter', orgName: 'X' });
    await ShareAccessLog.create({ reportId: insertedId, shareTokenId: 'tok-log-test', recruiterUserId: rec._id, recruiterOrg: 'X', action: 'view' });

    // Owner reads their log
    const ownerAgent = request.agent(app);
    const ownerCsrf = await getCsrf(ownerAgent);
    await ownerAgent.post('/api/auth/login').set(csrfHeaders(ownerCsrf)).send({ email: 'log-owner@example.test', password: 'CorrectHorseBatteryStaple99!' }).expect(200);
    const logRes = await ownerAgent.get(`/api/reports/${insertedId}/share/access-log`).expect(200);
    assert.equal(logRes.body.data.length, 1);
    assert.equal(logRes.body.data[0].recruiterOrg, 'X');
    assert.equal(logRes.body.data[0].recruiterUserId, undefined);
    assert.equal(logRes.body.data[0].recruiterEmail, undefined);

    // Another student cannot see it — create directly to avoid register rate limiter
    const otherPw = await hashPassword('CorrectHorseBatteryStaple99!');
    await User.create({ email: 'other-student@example.test', passwordHash: otherPw, displayName: 'Other', role: 'student' });
    const otherAgent = request.agent(app);
    const otherCsrf = await getCsrf(otherAgent);
    await otherAgent.post('/api/auth/login').set(csrfHeaders(otherCsrf)).send({ email: 'other-student@example.test', password: 'CorrectHorseBatteryStaple99!' }).expect(200);
    await otherAgent.get(`/api/reports/${insertedId}/share/access-log`).expect(404);
  });

  it('X2 - /demo/:id returns 404 not 401 when no matching demo exists', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app).get(`/api/demo/${fakeId}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'DEMO_NOT_FOUND');
  });

  it('R1 recruiter /opened - only returns log entries for the requesting recruiter', async () => {
    const studentPw = await hashPassword('CorrectHorseBatteryStaple99!');
    const student = await User.create({ email: 'st@example.test', passwordHash: studentPw, displayName: 'St', role: 'student' });
    const { insertedId } = await makeAnalysis(student, { isPublic: true, shareId: 'tok-r1-opened' });

    const rec1Pw = await hashPassword('CorrectHorseBatteryStaple99!');
    const rec1 = await User.create({ email: 'rec1@example.test', passwordHash: rec1Pw, displayName: 'Rec1', role: 'recruiter', orgName: 'Alpha' });
    const rec2Pw = await hashPassword('CorrectHorseBatteryStaple99!');
    const rec2 = await User.create({ email: 'rec2@example.test', passwordHash: rec2Pw, displayName: 'Rec2', role: 'recruiter', orgName: 'Beta' });
    await ShareAccessLog.create({ reportId: insertedId, shareTokenId: 'tok-r1-opened', recruiterUserId: rec1._id, recruiterOrg: 'Alpha', action: 'view' });
    await ShareAccessLog.create({ reportId: insertedId, shareTokenId: 'tok-r1-opened', recruiterUserId: rec2._id, recruiterOrg: 'Beta', action: 'view' });

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);
    await agent.post('/api/auth/login').set(csrfHeaders(csrfToken)).send({ email: 'rec1@example.test', password: 'CorrectHorseBatteryStaple99!' }).expect(200);
    const res = await agent.get('/api/recruiter/opened').expect(200);
    assert.equal(res.body.data.length, 1, 'rec1 should only see their own opened entries');
    assert.equal(res.body.data[0].shareToken, 'tok-r1-opened');
  });
});
