import { client } from './client.js';

export const analysisApi = {
  create: (file, githubUsername, onUploadProgress) => {
    const body = new FormData();
    body.append('resume', file);
    body.append('githubUsername', githubUsername);
    return client.post('/analysis', body, { onUploadProgress });
  },
  list:         (signal)           => client.get('/analysis', { signal }),
  get:          (id, signal)       => client.get(`/analysis/${id}`, { signal }),
  skills:       (id, signal)       => client.get(`/analysis/${id}/skills`, { signal }),
  skill:        (id, skill, signal) => client.get(`/analysis/${id}/skills/${encodeURIComponent(skill)}`, { signal }),
  repositories: (id, signal)       => client.get(`/analysis/${id}/repositories`, { signal }),
  retry:        id                 => client.post(`/analysis/${id}/retry`, {}),
  reanalyze:    id                 => client.post(`/analysis/${id}/reanalyze`, {}),
  diff:         (id, signal)       => client.get(`/analysis/${id}/diff`, { signal }),
  share:        (id, isPublic)     => client.post(`/analysis/${id}/share`, { isPublic }),
  getShared:    (shareId, signal)  => client.get(`/share/${shareId}`, { signal }),
  exportData:   (id, signal)       => client.get(`/analysis/${id}/export`, { signal }),
  loadDemo:     id                 => client.get(`/demo/${id}`),
  remove:       id                 => client.delete(`/analysis/${id}`),
};
