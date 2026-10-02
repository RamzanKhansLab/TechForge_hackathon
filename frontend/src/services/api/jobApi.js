import { client, accessConfig } from './client.js';
import { getToken } from '../storage.js';
export const jobApi = {
  create: input => client.post('/jobs/analyze',input,accessConfig(getToken('analysis',input.analysisId))),
  get: (id,signal) => client.get(`/jobs/${id}`,{ ...accessConfig(getToken('job',id)), signal }),
  task: (id,skill,status) => client.patch(`/jobs/${id}/tasks/${encodeURIComponent(skill)}`,{ status },accessConfig(getToken('job',id))),
};
