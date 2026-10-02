import { client, accessConfig } from './client.js';
import { getToken } from '../storage.js';
const config = id => accessConfig(getToken('analysis',id));
export const analysisApi = {
  create: (file,githubUsername,onUploadProgress) => { const body = new FormData(); body.append('resume',file); body.append('githubUsername',githubUsername); return client.post('/analysis',body,{ onUploadProgress }); },
  get: (id,signal) => client.get(`/analysis/${id}`,{ ...config(id), signal }),
  skills: (id,signal) => client.get(`/analysis/${id}/skills`,{ ...config(id), signal }),
  skill: (id,skill,signal) => client.get(`/analysis/${id}/skills/${encodeURIComponent(skill)}`,{ ...config(id), signal }),
  repositories: (id,signal) => client.get(`/analysis/${id}/repositories`,{ ...config(id), signal }),
  retry: id => client.post(`/analysis/${id}/retry`,{},config(id)),
  reanalyze: id => client.post(`/analysis/${id}/reanalyze`,{},config(id)),
  diff: (id,signal) => client.get(`/analysis/${id}/diff`,{ ...config(id), signal }),
  share: (id, isPublic) => client.post(`/analysis/${id}/share`, { isPublic }, config(id)),
  getShared: (shareId, signal) => client.get(`/share/${shareId}`, { signal }),
  exportData: (id, signal) => client.get(`/analysis/${id}/export`, { ...config(id), signal }),
  loadDemo: () => client.post('/analysis/demo', {}),
  remove: id => client.delete(`/analysis/${id}`,config(id)),
};



