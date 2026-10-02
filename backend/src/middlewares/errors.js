import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
export function notFound(req, res, next) { next(new AppError(404, 'ROUTE_NOT_FOUND', 'This API route does not exist.')); }
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error instanceof AppError ? error.message : 'Something went wrong. Please try again.';
  if (error instanceof ZodError) { status = 400; code = 'INVALID_INPUT'; message = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '); }
  if (error instanceof multer.MulterError) { status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; code = error.code; message = error.code === 'LIMIT_FILE_SIZE' ? 'The PDF exceeds the allowed upload size.' : 'Upload one PDF using the resume field.'; }
  if (error.type === 'entity.too.large') { status = 413; code = 'BODY_TOO_LARGE'; message = 'The request is too large.'; }
  if (error instanceof SyntaxError && 'body' in error) { status = 400; code = 'INVALID_JSON'; message = 'The request body must be valid JSON.'; }
  logger.error('request_error', { requestId: req.id, status, code });
  res.status(status).json({ success: false, error: { code, message, ...(error instanceof AppError && error.details ? { details: error.details } : {}), requestId: req.id } });
}
