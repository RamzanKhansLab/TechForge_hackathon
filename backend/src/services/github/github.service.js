import axios from 'axios';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
const api = axios.create({ baseURL: 'https://api.github.com', timeout: 15000, maxContentLength: 4 * 1024 * 1024, maxRedirects: 0, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': env.GITHUB_API_VERSION, 'User-Agent': 'SkillProof', ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) } });
const cache = new Map();
export async function githubGet(path, params = {}) {
  const key = `${path}:${JSON.stringify(params)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (cached) cache.delete(key);
  try {
    const response = await api.get(path, { params });
    const value = { data: response.data, hasNext: /rel="next"/.test(response.headers.link || '') };
    if (env.GITHUB_CACHE_TTL_SECONDS && Buffer.byteLength(JSON.stringify(value)) < 180000) {
      if (cache.size >= 180) cache.delete(cache.keys().next().value);
      cache.set(key, { value, expires: Date.now() + env.GITHUB_CACHE_TTL_SECONDS * 1000 });
    }
    return value;
  } catch (error) {
    const status = error.response?.status;
    logger.warn('github_request_failed', { status: status || 0 });
    if (status === 429 || (status === 403 && (error.response?.headers['x-ratelimit-remaining'] === '0' || /rate limit|abuse/i.test(error.response?.data?.message || '')))) {
      throw new AppError(429, 'GITHUB_RATE_LIMIT', 'GitHub API rate limit reached. Try again after the limit resets.', { resetAt: error.response?.headers['x-ratelimit-reset'] ? new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000).toISOString() : null });
    }
    if (status === 404) throw new AppError(404, 'GITHUB_NOT_FOUND', 'The requested public GitHub resource was not found.');
    if (status === 401) throw new AppError(502, 'GITHUB_AUTH_FAILED', 'The server GitHub credential needs to be updated.');
    throw new AppError(502, 'GITHUB_UNAVAILABLE', 'GitHub is temporarily unavailable or this resource cannot be read.');
  }
}
export async function getProfile(username) {
  try {
    const { data } = await githubGet(`/users/${encodeURIComponent(username)}`);
    return { login: data.login, name: data.name, avatarUrl: data.avatar_url, url: data.html_url, bio: data.bio, publicRepos: data.public_repos, followers: data.followers };
  } catch (error) { if (error.status === 404) throw new AppError(404, 'GITHUB_USER_NOT_FOUND', 'The GitHub username could not be found.'); throw error; }
}
export async function getRepositories(username) {
  const repositories = []; let hasNext = false;
  for (let page = 1; page <= 2; page++) {
    const response = await githubGet(`/users/${encodeURIComponent(username)}/repos`, { per_page: 100, page, sort: 'pushed', type: 'owner' });
    repositories.push(...response.data); hasNext = response.hasNext;
    if (!hasNext) break;
  }
  return { repositories: repositories.filter(repo => !repo.fork && !repo.archived && !repo.disabled && repo.size > 0).slice(0, env.MAX_REPOSITORIES), truncated: hasNext, considered: repositories.length };
}
export async function optionalGithub(path, params, warnings, label) {
  try { return await githubGet(path, params); }
  catch (error) { if (['GITHUB_RATE_LIMIT','GITHUB_AUTH_FAILED'].includes(error.code)) throw error; warnings.push(`${label} unavailable (${error.code}).`); return null; }
}
