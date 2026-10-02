/**
 * controllers/public.controller.js
 *
 * Public Recruiter Lens endpoints.
 * All endpoints rely solely on public capability tokens (shareId) with isPublic=true.
 * No user logins, no candidate ranking, no recruiter tracking.
 */
import { Analysis } from '../models/Analysis.js';
import { publicDocument } from '../utils/access.js';
import { AppError } from '../utils/AppError.js';
import { buildPublicMatch, buildPublicCompare } from '../services/recruiter/publicMatch.service.js';
import { verifyInstruction } from '../services/recruiter/verify.service.js';

/**
 * GET /api/public/:shareToken/summary
 * Returns public snapshot summary, discrepancies, trust flags, and freshness.
 */
export async function getSummary(req, res) {
  const { shareToken } = req.params;
  const analysis = await Analysis.findOne({
    shareId: shareToken,
    isPublic: true,
    status: 'completed'
  });

  if (!analysis) {
    throw new AppError(404, 'SHARE_LINK_INVALID_OR_REVOKED', 'This shared candidate report is not publicly available or has been revoked.');
  }

  const doc = publicDocument(analysis);
  const repos = doc.repositories || [];

  // Freshness calculation
  const lastAnalyzedAt = doc.completedAt || doc.createdAt || null;
  const newestRepoPushAt = repos.reduce((best, r) => {
    const d = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    return d > best ? d : best;
  }, 0);

  const freshness = {
    lastAnalyzedAt,
    newestRepoPushAt: newestRepoPushAt ? new Date(newestRepoPushAt).toISOString() : null,
    stale: newestRepoPushAt > 0 && lastAnalyzedAt
      ? newestRepoPushAt > new Date(lastAnalyzedAt).getTime()
      : false
  };

  // Top trust flags
  const topTrustFlags = [];
  for (const skill of doc.skills || []) {
    for (const flag of skill.trustFlags || []) {
      if (!topTrustFlags.some(f => f.code === flag.code && f.repo === flag.repo)) {
        topTrustFlags.push(flag);
      }
    }
  }

  res.json({
    success: true,
    data: {
      handle: doc.githubUsername || doc.github?.login || 'candidate',
      analyzedAt: doc.completedAt || doc.createdAt,
      sharedAt: doc.updatedAt,
      summary: doc.summary || { claimed: 0, proven: 0, partial: 0, claimedOnly: 0 },
      discrepancyFindings: doc.discrepancyReport || [],
      topTrustFlags: topTrustFlags.slice(0, 10),
      freshness
    }
  });
}

/**
 * POST /api/public/:shareToken/match
 * Stateless match against a job description.
 * Body: { jdText: string, roleTitle?: string }
 */
export async function matchJd(req, res) {
  const { shareToken } = req.params;
  const { jdText, roleTitle } = req.body;

  if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 10) {
    throw new AppError(400, 'INVALID_JD_TEXT', 'Please provide a valid job description with at least 10 characters.');
  }

  const analysis = await Analysis.findOne({
    shareId: shareToken,
    isPublic: true,
    status: 'completed'
  });

  if (!analysis) {
    throw new AppError(404, 'SHARE_LINK_INVALID_OR_REVOKED', 'This shared candidate report is not publicly available or has been revoked.');
  }

  const doc = publicDocument(analysis);
  const matchResult = buildPublicMatch(doc, jdText, roleTitle);

  res.json({
    success: true,
    data: matchResult
  });
}

/**
 * POST /api/public/compare
 * Multi-candidate requirement matrix.
 * Body: { jdText: string, tokens: string[] }
 */
export async function compareCandidates(req, res) {
  const { jdText, tokens } = req.body;

  if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 10) {
    throw new AppError(400, 'INVALID_JD_TEXT', 'Please provide a valid job description with at least 10 characters.');
  }

  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 4) {
    throw new AppError(400, 'INVALID_TOKENS', 'Provide between 1 and 4 share tokens to compare.');
  }

  // Fetch all in parallel, but map back in EXACT input order
  const resolved = await Promise.all(
    tokens.map(async token => {
      try {
        const found = await Analysis.findOne({
          shareId: token,
          isPublic: true,
          status: 'completed'
        });
        if (!found) {
          return { token, analysis: null, error: 'TOKEN_INVALID_OR_REVOKED' };
        }
        return { token, analysis: publicDocument(found) };
      } catch (err) {
        return { token, analysis: null, error: err.message };
      }
    })
  );

  const compareResult = buildPublicCompare(resolved, jdText);

  res.json({
    success: true,
    data: compareResult
  });
}
