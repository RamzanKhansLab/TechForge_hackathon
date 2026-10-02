import { Router } from 'express';
import mongoose from 'mongoose';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import * as analysis from '../controllers/analysis.controller.js';
import * as jobs from '../controllers/jobs.controller.js';
import * as coach from '../controllers/coach.controller.js';
import * as statsCtrl from '../controllers/stats.controller.js';
import * as publicCtrl from '../controllers/public.controller.js';
import * as authCtrl from '../controllers/auth.controller.js';
import { requireAuth, requireRole, csrfGuard } from '../middlewares/auth.js';
import { uploadResume } from '../middlewares/upload.js';
import { validateId } from '../middlewares/validation.js';
import { SKILLS } from '../data/skills.js';
import { SCORING } from '../config/scoring.js';
import { env } from '../config/env.js';
import { searchOntology } from '../ontology/ontology.service.js';
export const router = Router();
const limited = { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } };
const analysisLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: limited });
const jobLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: limited });
const searchLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: limited });
const checkLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: limited });

// Auth rate limits (per Section A rules: login 5/min, register 5/hour, refresh 30/min)
const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: limited, keyGenerator: req => ipKeyGenerator(req.ip) });
const loginLimit = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: limited, keyGenerator: req => `${ipKeyGenerator(req.ip)}:${typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''}` });
const refreshLimit = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: limited });

router.get('/health', (req,res) => { const ready = mongoose.connection.readyState === 1; res.status(ready ? 200 : 503).json({ success: ready, ...(ready ? { data: { status: 'ok', service: 'skillproof-api' } } : { error: { code: 'DATABASE_UNAVAILABLE', message: 'Database connection is unavailable.' } }) }); });
router.get('/meta', (req,res) => res.json({ success: true, data: { maxFileSizeMb: env.MAX_FILE_SIZE_MB, maxRepositories: env.MAX_REPOSITORIES, skills: SKILLS.map(({id,name,category}) => ({id,name,category})), scoring: SCORING } }));
router.get('/ontology/search', searchLimit, (req, res) => res.json({ success: true, data: searchOntology(req.query.q) }));

// ── Auth routes (A1) ──────────────────────────────────────────────────────────
router.get('/auth/csrf', authCtrl.csrf);
router.post('/auth/register', registerLimit, csrfGuard, authCtrl.register);
router.post('/auth/login', loginLimit, csrfGuard, authCtrl.login);
router.post('/auth/logout', requireAuth, csrfGuard, authCtrl.logout);
router.post('/auth/refresh', refreshLimit, csrfGuard, authCtrl.refresh);
router.get('/auth/me', requireAuth, authCtrl.me);
router.post('/auth/change-password', requireAuth, csrfGuard, authCtrl.changePassword);
router.delete('/auth/account', requireAuth, csrfGuard, authCtrl.deleteAccount);

// ── Public stats (cached 5 min) ──────────────────────────────────────────────
router.get('/stats', statsCtrl.stats);


// ── Existing analysis routes (unchanged) ─────────────────────────────────────
router.get('/demo/:id', analysis.demo);
router.post('/reports/claim', requireAuth, requireRole('student'), csrfGuard, analysis.claimLegacy);
router.post('/analysis', requireAuth, requireRole('student'), csrfGuard, analysisLimit, uploadResume, analysis.create);
router.get('/analysis', requireAuth, requireRole('student'), analysis.list);
router.use('/analysis/:id', validateId);

router.get('/analysis/:id', requireAuth, requireRole('student'), analysis.read);
router.get('/analysis/:id/skills', requireAuth, requireRole('student'), analysis.skills);
router.get('/analysis/:id/skills/:skill', requireAuth, requireRole('student'), analysis.skill);
router.get('/analysis/:id/repositories', requireAuth, requireRole('student'), analysis.repositories);
router.post('/analysis/:id/retry', requireAuth, requireRole('student'), csrfGuard, analysisLimit, analysis.retry);
router.post('/analysis/:id/reanalyze', requireAuth, requireRole('student'), csrfGuard, analysisLimit, analysis.reanalyze);
router.get('/analysis/:id/diff', requireAuth, requireRole('student'), analysis.diff);
router.post('/analysis/:id/share', requireAuth, requireRole('student'), csrfGuard, analysis.share);
router.get('/analysis/:id/export', requireAuth, requireRole('student'), analysis.auditExport);
router.delete('/analysis/:id', requireAuth, requireRole('student'), csrfGuard, analysis.remove);

// ── Coach / student routes (S1) ───────────────────────────────────────────────
router.use('/reports/:id', validateId);
router.get('/reports/:id/readiness', requireAuth, requireRole('student'), coach.readiness);
router.get('/reports/:id/roadmap', requireAuth, requireRole('student'), coach.roadmap);
router.get('/reports/:id/resume-fixes', requireAuth, requireRole('student'), coach.resumeFixes);
router.post('/reports/:id/tasks/:taskId/check', requireAuth, requireRole('student'), csrfGuard, checkLimit, coach.taskCheck);
router.get('/reports/:id/roles/compare', requireAuth, requireRole('student'), coach.rolesCompare);

// ── Existing job routes (unchanged) + target-role tag ────────────────────────
router.post('/jobs/analyze', requireAuth, requireRole('student'), csrfGuard, jobLimit, jobs.create);
router.use('/jobs/:id', validateId);
router.get('/jobs/:id', requireAuth, requireRole('student'), jobs.read);
router.get('/jobs/:id/match', requireAuth, requireRole('student'), jobs.match);
router.patch('/jobs/:id/tasks/:skill', requireAuth, requireRole('student'), csrfGuard, jobs.task);
router.patch('/jobs/:id/target', requireAuth, requireRole('student'), csrfGuard, coach.tagRole);

// ── Public / Recruiter routes (S2) ──────────────────────────────────────────
router.get('/public/:shareToken', requireAuth, requireRole('recruiter'), publicCtrl.getProfile);
router.get('/public/:shareToken/summary', requireAuth, requireRole('recruiter'), publicCtrl.getSummary);
router.post('/public/:shareToken/match', requireAuth, requireRole('recruiter'), csrfGuard, jobLimit, publicCtrl.matchJd);
router.post('/public/compare', requireAuth, requireRole('recruiter'), csrfGuard, jobLimit, publicCtrl.compareCandidates);
router.get('/recruiter/opened', requireAuth, requireRole('recruiter'), publicCtrl.opened);
router.get('/reports/:id/share/access-log', requireAuth, requireRole('student'), publicCtrl.accessLog);
