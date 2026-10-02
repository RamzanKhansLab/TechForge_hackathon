import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;
const JWT_ACCESS_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

// Top common/weak passwords ban list
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '1234567890', 'qwertyuiop', 'letmein123',
  'admin12345', 'welcome123', 'iloveyou12', 'monkey1234', 'dragon1234',
  'master1234', 'superman12', 'trustno123', 'football12', 'passw0rd12'
]);

export function validatePasswordPolicy(password) {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  if (password.length < 10) return { valid: false, reason: 'Password must be at least 10 characters long.' };
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, reason: 'This password is too common and easily guessed.' };
  }
  return { valid: true };
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

export function hashRefreshToken(token) {
  return createHmac('sha256', env.REFRESH_SECRET).update(token).digest('hex');
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      role: user.role,
      email: user.email
    },
    env.JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function generateRefreshToken() {
  const token = randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function generateCsrfToken() {
  return randomBytes(24).toString('hex');
}

export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
