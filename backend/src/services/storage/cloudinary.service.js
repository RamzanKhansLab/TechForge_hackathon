import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
export async function uploadResume(buffer) {
  try {
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'raw', type: 'authenticated', public_id: `skillproof/resumes/${randomUUID()}.pdf`, overwrite: false, timeout: 60000 }, (error, result) => error ? reject(error) : resolve(result));
      stream.on('error', reject); stream.end(buffer);
    });
    return { public_id: uploaded.public_id, secure_url: uploaded.secure_url, resource_type: uploaded.resource_type, type: uploaded.type, format: 'pdf', bytes: uploaded.bytes };
  } catch { logger.error('cloudinary_upload_failed'); throw new AppError(502, 'STORAGE_UNAVAILABLE', 'Resume storage is temporarily unavailable. Please try again.'); }
}
export async function deleteResume(asset) {
  if (!asset?.public_id) return;
  try { await cloudinary.uploader.destroy(asset.public_id, { resource_type: 'raw', type: 'authenticated', invalidate: true }); }
  catch { logger.error('cloudinary_delete_failed'); throw new AppError(502, 'STORAGE_DELETE_FAILED', 'Resume storage could not be cleared. Please retry deletion.'); }
}
