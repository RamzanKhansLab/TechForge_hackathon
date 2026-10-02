import { ErrorNotice, Loading } from '../common/UI.jsx';
import { ImportKey } from '../common/AccessKey.jsx';
import AnalysisProgress from './AnalysisProgress.jsx';
import './ReportGate.css';
export default function ReportGate({resource,children}) {
  const {id,data,loading,error,reload} = resource;
  if (loading) return <Loading/>;
  if (error) return <><ErrorNotice error={error} retry={reload}/>{error.code === 'ACCESS_DENIED' && <ImportKey id={id} type="analysis"/>}</>;
  if (!data) return null;
  if (data.status !== 'completed') return <AnalysisProgress analysis={data} reload={reload}/>;
  return children(data);
}
