import { client } from './client.js';
export const jobApi = {
  create: input        => client.post('/jobs/analyze', input),
  get:    (id, signal) => client.get(`/jobs/${id}`, { signal }),
  task:   (id, skill, status) => client.patch(`/jobs/${id}/tasks/${encodeURIComponent(skill)}`, { status }),
};
