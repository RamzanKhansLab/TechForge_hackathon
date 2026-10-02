import { useState } from 'react';
import { KeyRound, Download } from 'lucide-react';
import { useReports } from '../../context/ReportContext.jsx';
import { ErrorNotice } from './UI.jsx';
import './AccessKey.css';
export function ImportKey({id,type}) {
  const [key,setKey] = useState(''); const [error,setError] = useState(''); const { remember } = useReports();
  const submit = event => {
    event.preventDefault();
    try {
      const parsed = key.trim().startsWith('{') ? JSON.parse(key) : { token: key.trim(),id,type };
      if (!/^[a-f\d]{64}$/.test(parsed.token) || parsed.id !== id || parsed.type !== type) throw new Error('Enter the access key for this report.');
      remember({id,type,token:parsed.token,label:parsed.label || 'Imported report',createdAt:new Date().toISOString()}); setError('');
    } catch { setError('This key is invalid or belongs to a different report.'); }
  };
  return <form onSubmit={submit} className="panel mx-auto mt-6 max-w-lg p-6"><KeyRound className="mb-4 text-muted"/><h2 className="text-lg font-bold">Open with an access key</h2><p className="muted my-3">Use the key saved when this report was created. The report URL alone does not grant access.</p><label className="label" htmlFor="access-key">Report access key</label><textarea id="access-key" className="input font-mono" rows={3} value={key} onChange={e => setKey(e.target.value)} required autoComplete="off" spellCheck={false}/>{error && <div className="mt-3"><ErrorNotice error={error}/></div>}<button className="btn btn-primary mt-4">Open report</button></form>;
}
export function ExportKey({id,type}) {
  const { reports } = useReports(); const report = reports.find(r => r.id === id && r.type === type);
  if (!report) return null;
  const save = () => { const blob = new Blob([JSON.stringify(report,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `skillproof-${type}-${id}-key.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
  return <button className="btn btn-secondary" onClick={save} title="Keep this file private. It grants access to this report."><Download size={16}/>Save access key</button>;
}
