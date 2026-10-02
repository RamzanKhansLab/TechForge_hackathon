import { client } from './client.js';

export const coachApi = {
  getReadiness:   (id, signal)                  => client.get(`/reports/${id}/readiness`, { signal }),
  getRoadmap:     (id, params = {}, signal)      => client.get(`/reports/${id}/roadmap`, { params, signal }),
  getResumeFixes: (id, signal)                  => client.get(`/reports/${id}/resume-fixes`, { signal }),
  checkTask:      (id, taskId, signal)          => client.post(`/reports/${id}/tasks/${encodeURIComponent(taskId)}/check`, {}, { signal }),
  getRoleCompare: (id, signal)                  => client.get(`/reports/${id}/roles/compare`, { signal }),
  tagTargetRole:  (jobId, isTargetRole, roleTitle) => client.patch(`/jobs/${jobId}/target`, { isTargetRole, roleTitle }),
};
