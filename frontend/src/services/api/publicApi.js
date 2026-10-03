import { client } from './client.js';

export const publicApi = {
  // Recruiter-authenticated routes (requireRole('recruiter'))
  getProfile:     (shareToken, signal) => client.get(`/public/${encodeURIComponent(shareToken)}`, { signal }),
  getSummary:     (shareToken, signal) => client.get(`/public/${encodeURIComponent(shareToken)}/summary`, { signal }),
  matchJd:        (shareToken, jdText, roleTitle, signal) => client.post(`/public/${encodeURIComponent(shareToken)}/match`, { jdText, roleTitle }, { signal }),
  compare:        (tokens, jdText, signal) => client.post('/public/compare', { tokens, jdText }, { signal }),
  // Unauthenticated public share view (used by SharedProfile)
  getSharedView:  (shareId, signal) => client.get(`/share/${encodeURIComponent(shareId)}`, { signal }),
  getStats:       (signal) => client.get('/stats', { signal }),
};
