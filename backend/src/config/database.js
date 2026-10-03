import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', () => logger.error('database_error'));
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 4000, maxPoolSize: 5 });
    logger.info('database_connected');
  } catch (atlasErr) {
    if (env.NODE_ENV === 'development') {
      logger.info('Atlas connection blocked by IP whitelist/network. Starting in-memory MongoDB fallback...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri, { maxPoolSize: 5 });
        logger.info('database_connected', { mode: 'in-memory-fallback' });
        return;
      } catch (memErr) {
        logger.error('memory_fallback_failed', { message: memErr.message });
      }
    }
    throw atlasErr;
  }
}
