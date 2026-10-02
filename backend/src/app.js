import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { env, clientOrigins } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errors.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/AppError.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.use(helmet());
app.use((req,res,next) => {
  req.id = randomUUID(); res.setHeader('X-Request-Id',req.id); res.setHeader('Cache-Control','no-store');
  const started = Date.now();
  res.on('finish',() => logger.info('request', { requestId: req.id, method: req.method, path: req.path.slice(0,200), status: res.statusCode, durationMs: Date.now()-started })); next();
});
app.use(cors({
  origin: (origin,callback) => callback(!origin || clientOrigins.includes(origin) ? null : new AppError(403,'ORIGIN_NOT_ALLOWED','This origin is not allowed.'), true),
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','X-Access-Token','X-SP-CSRF','Authorization']
}));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' } } }));
app.use(express.json({ limit: '64kb' }));
app.use('/api',router);
app.use(notFound);
app.use(errorHandler);
