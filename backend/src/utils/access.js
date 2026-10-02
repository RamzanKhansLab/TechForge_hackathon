import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from './AppError.js';
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export function newAccess() {
  const accessToken = randomBytes(32).toString('hex');
  return { accessToken, accessTokenHash: hashToken(accessToken) };
}
export function authorize(document, token) {
  if (!document) throw new AppError(404, 'NOT_FOUND', 'This report could not be found.');
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !document.accessTokenHash || !timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(document.accessTokenHash))) {
    throw new AppError(403, 'ACCESS_DENIED', 'Open this report in the browser that created it, or import its access key.');
  }
  return document;
}
export function publicDocument(document) {
  const result = document.toObject ? document.toObject({ flattenMaps: true }) : { ...document };
  for (const key of ['accessTokenHash', 'leaseOwner', 'leaseUntil', '__v']) delete result[key];
  if (result.resume?.asset) {
    result.resume = { ...result.resume, asset: { format: result.resume.asset.format, bytes: result.resume.asset.bytes } };
  }
  return result;
}
