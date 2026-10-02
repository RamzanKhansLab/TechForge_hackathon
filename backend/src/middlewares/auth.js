import { verifyAccessToken, safeCompare } from '../utils/auth.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { clientOrigins } from '../config/env.js';

export const ACCESS_COOKIE_NAME = 'sp_token';
export const REFRESH_COOKIE_NAME = 'sp_refresh';
export const CSRF_COOKIE_NAME = 'sp_csrf';

/**
 * Authentication middleware: parses JWT from httpOnly cookie or Authorization Bearer header.
 * Attaches req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[ACCESS_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required to access this resource.');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new AppError(401, 'TOKEN_EXPIRED', 'Your access token has expired. Please refresh your session.');
      }
      throw new AppError(401, 'INVALID_TOKEN', 'Your authentication token is invalid.');
    }

    const user = await User.findById(decoded.sub);
    if (!user || user.deletedAt) {
      throw new AppError(401, 'USER_NOT_FOUND', 'The account associated with this session no longer exists.');
    }

    if (user.isLocked()) {
      throw new AppError(423, 'ACCOUNT_LOCKED', 'This account is temporarily locked due to repeated failed logins.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN_ROLE', `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`));
    }
    next();
  };
}

/**
 * CSRF Guard for state-changing requests (POST, PUT, PATCH, DELETE).
 * Enforces Double-Submit Cookie matching X-SP-CSRF header AND validates Origin/Referer header against clientOrigins.
 */
export function csrfGuard(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // 1. Origin / Referer validation
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    return next(new AppError(403, 'CSRF_ORIGIN_INVALID', 'A permitted request origin is required.'));
  }
  try {
    const originUrl = new URL(origin);
    if (!clientOrigins.includes(originUrl.origin)) {
      return next(new AppError(403, 'CSRF_ORIGIN_INVALID', 'Request origin does not match an allowed client origin.'));
    }
  } catch {
    return next(new AppError(403, 'CSRF_ORIGIN_INVALID', 'Malformed request origin header.'));
  }

  // 2. Double-submit cookie comparison
  const cookieCsrf = req.cookies?.[CSRF_COOKIE_NAME];
  const headerCsrf = req.headers['x-sp-csrf'];

  if (!cookieCsrf || !headerCsrf || !safeCompare(cookieCsrf, headerCsrf)) {
    return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'CSRF token validation failed. Ensure X-SP-CSRF matches the csrf cookie.'));
  }

  next();
}

/**
 * Optional Auth: populates req.user if a valid token is present, but does not error if absent.
 */
export async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.[ACCESS_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub);
      if (user && !user.deletedAt && !user.isLocked()) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid/expired token in optionalAuth
  }
  next();
}
