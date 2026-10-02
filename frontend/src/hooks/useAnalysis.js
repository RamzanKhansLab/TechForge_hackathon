import { useParams } from 'react-router-dom';
import { useResource } from './useResource.js';
import { analysisApi } from '../services/api/analysisApi.js';
import { useReports } from '../context/ReportContext.jsx';
export function useAnalysis() {
  const { id } = useParams(); const { reports } = useReports();
  const token = reports.find(r => r.type === 'analysis' && r.id === id)?.token;
  return { id,...useResource(`analysis:${id}:${token}`,signal => analysisApi.get(id,signal),true) };
}
