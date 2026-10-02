import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useResource } from './useResource.js';
import { analysisApi } from '../services/api/analysisApi.js';
import { useReports } from '../context/ReportContext.jsx';
export function useAnalysis() {
  const { id } = useParams(); const { reports,remember } = useReports();
  const saved = reports.find(r => r.type === 'analysis' && r.id === id);
  const resource = useResource(`analysis:${id}:${saved?.token}`,signal => analysisApi.get(id,signal),true);
  useEffect(() => {
    const data = resource.data; const label = data?.candidate?.name || data?.githubUsername;
    if (data && saved && (saved.status !== data.status || saved.label !== label)) remember({...saved,status:data.status,label});
  },[resource.data,saved,remember]);
  return { id,...resource };
}
