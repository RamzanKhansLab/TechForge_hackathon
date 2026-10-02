import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { startWorker, stopWorker } from './services/analysis/analysis.worker.js';
import { logger } from './utils/logger.js';
try {
  await connectDatabase();
  const server = app.listen(env.PORT,'0.0.0.0',() => { logger.info('server_listening',{ port: env.PORT }); startWorker(); });
  server.requestTimeout = 120000;
  server.on('error',error => { logger.error('server_error',{ code: error.code }); process.exit(1); });
  let closing = false;
  const shutdown = () => {
    if (closing) return; closing = true; stopWorker();
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(0),25000).unref();
  };
  process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
} catch { logger.error('startup_failed',{ message: 'Check database connectivity and backend environment configuration.' }); process.exit(1); }
