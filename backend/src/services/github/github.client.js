import axios from 'axios';
import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { GithubCache } from '../../models/GithubCache.js';

const api = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  maxContentLength: 4 * 1024 * 1024,
  maxRedirects: 0,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': env.GITHUB_API_VERSION,
    'User-Agent': 'SkillProof',
    ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {})
  }
});

const rawClient = axios.create({
  baseURL: 'https://raw.githubusercontent.com',
  timeout: 15000,
  maxContentLength: 4 * 1024 * 1024,
  responseType: 'text',
  headers: {
    'User-Agent': 'SkillProof',
    ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {})
  }
});

// Request budget tracker per analysis
export class RequestBudget {
  constructor(maxRequests = 120, maxSearchRequests = 30) {
    this.maxRequests = maxRequests;
    this.maxSearchRequests = maxSearchRequests;
    this.usedRequests = 0;
    this.usedSearchRequests = 0;
    this.isLimited = false;
    this.limitResetAt = null;
    this.limitReason = null;
  }

  canMakeRequest(isSearch = false) {
    if (this.isLimited) return false;
    if (isSearch) {
      return this.usedSearchRequests < this.maxSearchRequests && this.usedRequests < this.maxRequests;
    }
    return this.usedRequests < this.maxRequests;
  }

  recordRequest(isSearch = false) {
    this.usedRequests++;
    if (isSearch) this.usedSearchRequests++;
  }

  record304Free() {
    // 304 responses are free per Amendment 1
  }

  markRateLimited(resetAt, reason = 'GitHub rate limit exceeded') {
    this.isLimited = true;
    this.limitResetAt = resetAt ? new Date(resetAt) : new Date(Date.now() + 60 * 60 * 1000);
    this.limitReason = reason;
  }

  get remaining() {
    return Math.max(0, this.maxRequests - this.usedRequests);
  }
}

/**
 * Bounded concurrency executor (p-limit equivalent with zero external dependency)
 */
export function pLimit(concurrency = 4) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const { fn, resolve, reject } = queue.shift();
      activeCount++;
      run(fn, resolve, reject);
    }
  };

  const run = (fn, resolve, reject) => {
    Promise.resolve()
      .then(fn)
      .then(val => {
        resolve(val);
        next();
      })
      .catch(err => {
        reject(err);
        next();
      });
  };

  return (fn) => new Promise((resolve, reject) => {
    if (activeCount < concurrency) {
      activeCount++;
      run(fn, resolve, reject);
    } else {
      queue.push({ fn, resolve, reject });
    }
  });
}

/**
 * GitHub REST request with MongoDB ETag cache (6-hour TTL)
 */
export async function githubGet(path, params = {}, budget = null, isSearch = false) {
  const cacheKey = `${path}:${JSON.stringify(params)}`;

  // 1. Check MongoDB raw cache
  let cachedDoc = null;
  try {
    cachedDoc = await GithubCache.findOne({ key: cacheKey });
  } catch (err) {
    logger.warn('github_cache_lookup_failed', { key: cacheKey });
  }

  // Check budget before making network call
  if (budget && !budget.canMakeRequest(isSearch)) {
    if (cachedDoc) {
      return { data: cachedDoc.data, hasNext: false, cached: true };
    }
    return { data: null, hasNext: false, rateLimited: true };
  }

  const headers = {};
  if (cachedDoc?.etag) {
    headers['If-None-Match'] = cachedDoc.etag;
  }

  try {
    if (budget) budget.recordRequest(isSearch);

    const response = await api.get(path, {
      params,
      headers: { ...api.defaults.headers, ...headers },
      validateStatus: status => (status >= 200 && status < 300) || status === 304
    });

    if (response.status === 304 && cachedDoc) {
      if (budget) budget.record304Free();
      return { data: cachedDoc.data, hasNext: false, cached: true };
    }

    const etag = response.headers.etag || null;
    const value = { data: response.data, hasNext: /rel="next"/.test(response.headers.link || '') };

    // Persist to GithubCache with 6h TTL
    try {
      await GithubCache.findOneAndUpdate(
        { key: cacheKey },
        {
          key: cacheKey,
          etag,
          data: response.data,
          status: response.status,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        { upsert: true }
      );
    } catch (saveErr) {
      logger.warn('github_cache_save_failed', { key: cacheKey });
    }

    return value;
  } catch (error) {
    const status = error.response?.status;
    const remainingRate = error.response?.headers?.['x-ratelimit-remaining'];
    const resetTimestamp = error.response?.headers?.['x-ratelimit-reset'];
    const resetAt = resetTimestamp ? new Date(Number(resetTimestamp) * 1000) : null;

    if (status === 429 || (status === 403 && (remainingRate === '0' || /rate limit|abuse/i.test(error.response?.data?.message || '')))) {
      if (budget) {
        budget.markRateLimited(resetAt, 'GitHub API rate limit reached.');
      }
      if (cachedDoc) {
        return { data: cachedDoc.data, hasNext: false, cached: true, rateLimited: true };
      }
      return { data: null, hasNext: false, rateLimited: true };
    }

    if (status === 404) return { data: null, hasNext: false, notFound: true };
    throw error;
  }
}

/**
 * Fetch raw file contents from raw.githubusercontent.com (Amendment 1)
 */
export async function getRawFile(owner, repo, branch, filePath, budget = null) {
  if (budget && !budget.canMakeRequest(false)) {
    return null;
  }

  const cleanPath = filePath.replace(/^\/+/, '');
  const cacheKey = `raw:${owner}/${repo}/${branch}/${cleanPath}`;

  // Check cache
  let cached = null;
  try {
    cached = await GithubCache.findOne({ key: cacheKey });
    if (cached) return cached.data;
  } catch (e) {}

  try {
    if (budget) budget.recordRequest(false);
    const url = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${cleanPath}`;
    const response = await rawClient.get(url, {
      validateStatus: status => (status >= 200 && status < 300) || status === 404
    });

    if (response.status === 404) return null;

    const content = typeof response.data === 'string' ? response.data.slice(0, 200000) : '';

    try {
      await GithubCache.findOneAndUpdate(
        { key: cacheKey },
        {
          key: cacheKey,
          data: content,
          status: response.status,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        { upsert: true }
      );
    } catch (e) {}

    return content;
  } catch (err) {
    if (err.response?.status === 404) return null;
    logger.warn('raw_file_fetch_failed', { repo: `${owner}/${repo}`, path: filePath });
    return null;
  }
}
