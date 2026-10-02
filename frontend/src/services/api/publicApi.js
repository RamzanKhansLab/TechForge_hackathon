import { client } from './client.js';

export const publicApi = {
  getSummary: (shareToken, signal) => client.get(`/public/${encodeURIComponent(shareToken)}/summary`, { signal }),
  matchJd: (shareToken, jdText, roleTitle, signal) => client.post(`/public/${encodeURIComponent(shareToken)}/match`, { jdText, roleTitle }, { signal }),
  compare: (tokens, jdText, signal) => client.post('/public/compare', { tokens, jdText }, { signal }),
  getSharedProfile: (shareId, signal) => client.get(`/share/${encodeURIComponent(shareId)}`, { signal }),
  getStats: (signal) => client.get('/stats', { signal }),
};
