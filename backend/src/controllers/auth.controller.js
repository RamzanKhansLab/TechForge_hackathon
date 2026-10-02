import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { Analysis } from '../models/Analysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { Evidence } from '../models/Evidence.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { deleteResume } from '../services/storage/cloudinary.service.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  generateAccessToken,
  generateRefreshToken,
  generateCsrfToken,
  hashRefreshToken
} from '../utils/auth.js';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME
} from '../middlewares/auth.js';

const cookieSecure = env.COOKIE_SECURE;

// Cookie helper
function setAuthCookies(res, accessToken, refreshTokenStr, csrfToken) {
  const cookieDefaults = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/'
  };

  // Access token cookie (15 min)
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...cookieDefaults,
    maxAge: 15 * 60 * 1000
  });

  // Refresh token cookie (7 days)
  if (refreshTokenStr) {
    res.cookie(REFRESH_COOKIE_NAME, refreshTokenStr, {
      ...cookieDefaults,
      path: '/api/auth', // restricted path for refresh cookie
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  // Non-httpOnly CSRF cookie readable by frontend to echo back in X-SP-CSRF header
  if (csrfToken) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
}

function clearAuthCookies(res) {
  const opts = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/' };
  res.clearCookie(ACCESS_COOKIE_NAME, opts);
  res.clearCookie(REFRESH_COOKIE_NAME, { ...opts, path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE_NAME, { ...opts, httpOnly: false });
}

export function csrf(req, res) {
  const csrfToken = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ success: true, data: { csrfToken } });
}

// Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(180),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(80),
  role: z.enum(['student', 'recruiter']),
  orgName: z.string().max(120).optional()
}).refine(data => data.role !== 'recruiter' || (data.orgName && data.orgName.trim().length > 0), {
  message: 'Organisation name is required for recruiter accounts',
  path: ['orgName']
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(10, 'New password must be at least 10 characters')
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required')
});

/**
 * POST /api/auth/register
 */
export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { email, password, displayName, role, orgName } = parsed.data;

  // Password policy check
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    throw new AppError(400, 'WEAK_PASSWORD', policyCheck.reason);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    // Generic message to avoid email enumeration
    throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    displayName: displayName.trim(),
    role,
    orgName: role === 'recruiter' ? orgName.trim() : null
  });

  // Issue tokens
  const accessToken = generateAccessToken(user);
  const { token: refreshTokenStr, tokenHash, expiresAt } = generateRefreshToken();
  const csrfToken = generateCsrfToken();
  const familyId = randomUUID();

  await RefreshToken.create({
    userId: user._id,
    familyId,
    tokenHash,
    userAgent: req.headers['user-agent']?.slice(0, 256) || null,
    ip: req.ip || null,
    expiresAt
  });

  setAuthCookies(res, accessToken, refreshTokenStr, csrfToken);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        orgName: user.orgName
      },
      csrfToken
    }
  });
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Generic message
  const invalidCredentialsError = new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

  if (!user || user.deletedAt) {
    throw invalidCredentialsError;
  }

  // Check lockout
  if (user.isLocked()) {
    const remainingMs = user.lockUntil.getTime() - Date.now();
    const retryAfter = Math.ceil(remainingMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    throw new AppError(423, 'ACCOUNT_LOCKED', `Account is temporarily locked. Try again in ${Math.ceil(retryAfter / 60)} minutes.`, {
      retryAfter
    });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 8) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      user.failedLogins = 0;
    }
    await user.save();
    throw invalidCredentialsError;
  }

  // Reset failed logins on success
  user.failedLogins = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // Issue tokens
  const accessToken = generateAccessToken(user);
  const { token: refreshTokenStr, tokenHash, expiresAt } = generateRefreshToken();
  const csrfToken = generateCsrfToken();
  const familyId = randomUUID();

  await RefreshToken.create({
    userId: user._id,
    familyId,
    tokenHash,
    userAgent: req.headers['user-agent']?.slice(0, 256) || null,
    ip: req.ip || null,
    expiresAt
  });

  setAuthCookies(res, accessToken, refreshTokenStr, csrfToken);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        orgName: user.orgName
      },
      csrfToken
    }
  });
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  const refreshTokenStr = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshTokenStr) {
    const hash = hashRefreshToken(refreshTokenStr);
    const existing = await RefreshToken.findOne({ tokenHash: hash });
    if (existing) {
      // Revoke whole family on explicit logout
      await RefreshToken.updateMany(
        { familyId: existing.familyId },
        { revokedAt: new Date() }
      );
    }
  }

  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Logged out successfully.' } });
}

/**
 * POST /api/auth/refresh
 * Refresh rotation and reuse detection.
 */
export async function refresh(req, res) {
  const refreshTokenStr = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshTokenStr) {
    clearAuthCookies(res);
    throw new AppError(401, 'MISSING_REFRESH_TOKEN', 'No refresh token provided.');
  }

  const hash = hashRefreshToken(refreshTokenStr);
  const tokenDoc = await RefreshToken.findOne({ tokenHash: hash });

  if (!tokenDoc) {
    clearAuthCookies(res);
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  // Reuse detection: token was already revoked or replaced!
  if (tokenDoc.revokedAt) {
    // Attack detected or token leak! Revoke entire token family immediately
    await RefreshToken.updateMany(
      { familyId: tokenDoc.familyId },
      { revokedAt: new Date() }
    );
    clearAuthCookies(res);
    throw new AppError(401, 'REFRESH_TOKEN_REUSED', 'Security alert: Refresh token reuse detected. All sessions revoked.');
  }

  // Check expiration
  if (tokenDoc.expiresAt < new Date()) {
    clearAuthCookies(res);
    throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired. Please log in again.');
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user || user.deletedAt || user.isLocked()) {
    clearAuthCookies(res);
    throw new AppError(401, 'USER_INACTIVE', 'User account is inactive or locked.');
  }

  // Rotate token: revoke current token and link replacement
  const { token: newRefreshTokenStr, tokenHash: newTokenHash, expiresAt: newExpiresAt } = generateRefreshToken();

  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedBy = newTokenHash;
  await tokenDoc.save();

  // Create new active token in same family
  await RefreshToken.create({
    userId: user._id,
    familyId: tokenDoc.familyId,
    tokenHash: newTokenHash,
    userAgent: req.headers['user-agent']?.slice(0, 256) || null,
    ip: req.ip || null,
    expiresAt: newExpiresAt
  });

  const accessToken = generateAccessToken(user);
  const csrfToken = generateCsrfToken();

  setAuthCookies(res, accessToken, newRefreshTokenStr, csrfToken);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        orgName: user.orgName
      },
      csrfToken
    }
  });
}

/**
 * GET /api/auth/me
 */
export async function me(req, res) {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
        role: req.user.role,
        orgName: req.user.orgName
      }
    }
  });
}

/**
 * POST /api/auth/change-password
 */
export async function changePassword(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = req.user;

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect.');
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    throw new AppError(400, 'WEAK_PASSWORD', policyCheck.reason);
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Revoke all other refresh token sessions
  const currentRefreshStr = req.cookies?.[REFRESH_COOKIE_NAME];
  const currentHash = currentRefreshStr ? hashRefreshToken(currentRefreshStr) : null;

  await RefreshToken.updateMany(
    { userId: user._id, tokenHash: { $ne: currentHash } },
    { revokedAt: new Date() }
  );

  res.json({
    success: true,
    data: { message: 'Password changed successfully. Other sessions revoked.' }
  });
}

/**
 * DELETE /api/auth/account
 * Complete purge of user, analyses, Cloudinary PDFs, snapshots, JD analyses, and evidence.
 */
export async function deleteAccount(req, res) {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { password } = parsed.data;
  const user = req.user;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_PASSWORD', 'Password confirmation is incorrect.');
  }

  // 1. Delete owned analyses and their Cloudinary assets
  const analyses = await Analysis.find({ ownerUserId: user._id });
  let deletedCloudinaryCount = 0;
  for (const a of analyses) {
    if (a.resume?.asset?.public_id) {
      await deleteResume(a.resume.asset);
      deletedCloudinaryCount++;
    }
  }

  const analysisIds = analyses.map(a => a._id);
  const shareRecords = analyses.filter(analysis => analysis.isPublic || analysis.shareId).length;
  const deletedAnalyses = await Analysis.deleteMany({ ownerUserId: user._id });
  const deletedJobs = await JobAnalysis.deleteMany({
    $or: [{ ownerUserId: user._id }, { analysisId: { $in: analysisIds } }]
  });
  const deletedEvidence = await Evidence.deleteMany({
    $or: [{ ownerUserId: user._id }, { analysisId: { $in: analysisIds } }]
  });
  const deletedTokens = await RefreshToken.deleteMany({ userId: user._id });

  // Delete user record
  await User.deleteOne({ _id: user._id });

  clearAuthCookies(res);

  res.json({
    success: true,
    data: {
      message: 'Account and all associated records permanently purged.',
      deleted: {
        analyses: deletedAnalyses.deletedCount,
        jobs: deletedJobs.deletedCount,
        evidence: deletedEvidence.deletedCount,
        shareRecords,
        sessions: deletedTokens.deletedCount,
        cloudinaryPdfs: deletedCloudinaryCount
      }
    }
  });
}
