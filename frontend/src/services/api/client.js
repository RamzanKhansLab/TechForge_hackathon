import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const client = axios.create({
  baseURL: baseURL.replace(/\/$/, ''),
  timeout: 120000,
  withCredentials: true,       // send/receive httpOnly auth cookies
});

// ── CSRF request interceptor ────────────────────────────────────────────────
// Reads sp_csrf from the non-httpOnly cookie and echoes it as X-SP-CSRF on
// every mutating request (POST, PUT, PATCH, DELETE). GET/HEAD/OPTIONS are safe.
function getCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)sp_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
const SAFE_METHODS = new Set(['get', 'head', 'options']);
client.interceptors.request.use(config => {
  if (!SAFE_METHODS.has((config.method || 'get').toLowerCase())) {
    const csrf = getCsrfCookie();
    if (csrf) config.headers['X-SP-CSRF'] = csrf;
  }
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
// On success: unwrap response.data.data.
// On TOKEN_EXPIRED: attempt one silent refresh then retry the original request.
// On all other errors: normalise to a plain Error with .code and .status.
let _refreshPromise = null;

client.interceptors.response.use(
  response => response.data.data,
  async error => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const original = error.config;
    const code = error.response?.data?.error?.code;

    // Silent refresh on expired access token (attempt once per failing request)
    if (code === 'TOKEN_EXPIRED' && !original._retried) {
      original._retried = true;
      try {
        // Deduplicate concurrent refresh calls
        if (!_refreshPromise) {
          _refreshPromise = client.post('/auth/refresh').finally(() => { _refreshPromise = null; });
        }
        await _refreshPromise;
        return client(original); // retry with new access cookie
      } catch {
        // Refresh failed — fall through to error normalisation below
      }
    }

    const problem = new Error(
      error.response?.data?.error?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : 'Could not reach the API. Check your connection and server configuration.')
    );
    problem.code = code || 'NETWORK_ERROR';
    problem.status = error.response?.status;
    return Promise.reject(problem);
  }
);

// Kept for the legacy demo route which is still open without auth
export const getMeta = signal => client.get('/meta', { signal });
