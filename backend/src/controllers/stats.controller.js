/**
 * controllers/stats.controller.js
 * Public stats endpoint – cached 5 minutes in memory.
 * Only aggregated counts; no personal data.
 */
import { Analysis } from '../models/Analysis.js';
import { Evidence } from '../models/Evidence.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
let cacheAt = 0;

export async function stats(req, res) {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) {
    return res.json({ success: true, data: cache });
  }

  const [analyses, skillsVerified] = await Promise.all([
    Analysis.countDocuments({ status: 'completed' }),
    Evidence.countDocuments({ flagged: false }),
  ]);

  cache = { analyses, skillsVerified };
  cacheAt = now;

  res.json({ success: true, data: cache });
}
