import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Github, ShieldCheck, FileSearch, GitBranch, LockKeyhole, LoaderCircle } from 'lucide-react';
import ResumeUpload from '../../components/forms/ResumeUpload.jsx';
import { PageHeading, ErrorNotice, Note } from '../../components/common/UI.jsx';
import { analysisApi } from '../../services/api/analysisApi.js';
import { getMeta } from '../../services/api/client.js';
import { useResource } from '../../hooks/useResource.js';
import { useReports } from '../../context/ReportContext.jsx';
import './Analyze.css';
export default function Analyze() {
  const [file,setFile] = useState(null); const [username,setUsername] = useState(''); const [consent,setConsent] = useState(false);
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [uploadPercent,setUploadPercent] = useState(0);
  const { data:meta,error:metaError,reload } = useResource('meta',getMeta);
  const { remember } = useReports(); const navigate = useNavigate(); const maxSize = meta?.maxFileSizeMb || 5;
  function chooseFile(next) { setError(''); if (next && (!/\.pdf$/i.test(next.name) || next.size > maxSize*1024*1024)) { setError(`Select a PDF no larger than ${maxSize} MB.`); return; } setFile(next); }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!file) { setError('Please upload a resume PDF.'); return; }
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username.trim())) {setError('Enter a valid GitHub username, without a URL or @.'); return;}
    setBusy(true); setUploadPercent(0);
    try { const data = await analysisApi.create(file,username.trim(),event => setUploadPercent(Math.min(100,Math.round((event.progress || 0)*100)))); remember({ type:'analysis',id:data.analysisId,token:data.accessToken,label:username.trim(),createdAt:new Date().toISOString(),status:'queued' }); navigate(`/analysis/${data.analysisId}`); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <><PageHeading eyebrow="A fresh perspective" title="Let’s connect the evidence." description="A resume tells one part of the story. Public GitHub work helps fill in the rest."/>
    <div className="grid items-start gap-7 xl:grid-cols-[1.55fr_1fr]"><form onSubmit={submit} className="panel p-6 sm:p-8"><div className="mb-7 flex items-center gap-3 border-b border-line pb-6"><span className="flex size-9 items-center justify-center rounded-xl bg-[#eff4e8] text-[#66864b]"><FileSearch size={19}/></span><div><h2 className="font-bold">Candidate details</h2><p className="mt-1 text-xs text-muted">Two inputs. One connected skill report.</p></div></div>
      <ResumeUpload file={file} onChange={chooseFile} maxSize={maxSize} disabled={busy}/><div className="mt-7"><label className="label" htmlFor="github-username">GitHub username <span className="font-normal text-muted">*</span></label><div className="relative"><Github className="absolute left-4 top-3.5 text-muted" size={18}/><input id="github-username" className="input pl-11" placeholder="e.g. octocat" value={username} onChange={e => setUsername(e.target.value)} required maxLength={39} disabled={busy} autoComplete="off" spellCheck={false}/></div><p className="mt-2 text-xs text-muted">We inspect public, non-fork repositories. No GitHub sign-in needed.</p></div>
      <label className="my-7 flex items-start gap-3 text-xs leading-5 text-muted"><input className="mt-1 size-4 shrink-0 accent-forest" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required disabled={busy}/>I own this resume or have permission to process it, and understand that the PDF will be stored privately for this report.</label>
      {error && <div className="mb-5"><ErrorNotice error={error}/></div>}{metaError && <div className="mb-5"><ErrorNotice error={metaError} retry={reload}/></div>}
      <button className="btn btn-primary w-full" disabled={busy || !consent}>{busy ? <><LoaderCircle size={17} className="animate-spin"/>{uploadPercent < 100 ? `Uploading resume… ${uploadPercent}%` : 'Storing and processing resume…'}</> : <>Analyze candidate<ArrowRight size={17}/></>}</button>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-[11px] text-muted font-sans">Want to explore instantly without uploading?</span>
        <button
          type="button"
          onClick={async () => {
            setBusy(true);
            try {
              const res = await analysisApi.loadDemo();
              remember({
                type: 'analysis',
                id: res.data.analysisId,
                token: res.data.accessToken,
                label: 'demo-engineer',
                createdAt: new Date().toISOString(),
                status: 'completed'
              });
              navigate(`/analysis/${res.data.analysisId}`);
            } catch (e) {
              setError(e.message || 'Failed to load sample demo report');
            } finally {
              setBusy(false);
            }
          }}
          className="text-[11px] font-mono font-semibold text-[#2e6b3e] underline hover:text-black cursor-pointer"
        >
          Load Verified Demo Dossier ↗
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted" role={busy ? 'status' : undefined}>{busy ? 'Keep this page open until your report is created.' : 'Your report is private to its access key. Save the key to keep access.'}</p>
    </form><aside className="space-y-5"><div className="analyze-aside p-7"><p className="eyebrow mb-6">What’s inside your report</p>{[{icon:FileSearch,title:'Resume skill map',text:'Technical skills extracted and grouped by category.'},{icon:GitBranch,title:'Repository evidence',text:'Dependencies, languages, activity, tests, and configuration.'},{icon:ShieldCheck,title:'A transparent skill picture',text:'Proven, Partial, or Claimed-only — with reasons you can inspect.'}].map(({icon:Icon,title,text}) => <div className="mb-6 flex gap-4 last:mb-0" key={title}><span className="h-fit rounded-lg bg-white/70 p-2.5 text-[#607d4b]"><Icon size={18}/></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1.5 text-xs leading-5 text-muted">{text}</p></div></div>)}</div><div className="panel flex gap-3 p-5"><LockKeyhole size={18} className="mt-1 shrink-0 text-muted"/><p className="text-xs leading-5 text-muted">Your resume stays private. Report access is saved in this browser, and you can delete the report and stored PDF after processing.</p></div><Note>Public code is only part of someone’s experience. These results describe available evidence, not overall competence. <Link to="/methodology" className="underline">Read the methodology.</Link></Note></aside></div>
  </>;

}
