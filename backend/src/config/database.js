import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', () => logger.error('database_error'));
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 });
  logger.info('database_connected');
}
