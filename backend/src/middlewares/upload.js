import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1, fields: 2, parts: 3, fieldSize: 200 },
  fileFilter: (req, file, callback) => callback(file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname) ? null : new AppError(400, 'INVALID_FILE_TYPE', 'Please upload a PDF resume.'), true),
}).single('resume');
