import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Github, CheckCircle2, CircleDashed, MinusCircle, Layers, BriefcaseBusiness, Trash2, FileText } from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis.js';
import { useReports } from '../../context/ReportContext.jsx';
import { PageHeading, ExternalLink, Note, ErrorNotice } from '../../components/common/UI.jsx';
import { ExportKey } from '../../components/common/AccessKey.jsx';
import ReportGate from '../../components/dashboard/ReportGate.jsx';
import OverviewChart from '../../components/dashboard/OverviewChart.jsx';
import RepositoryCard from '../../components/dashboard/RepositoryCard.jsx';
import SkillTable from '../../components/skills/SkillTable.jsx';
import DiscrepancyReport from '../../components/dashboard/DiscrepancyReport.jsx';
import DumbbellChart from '../../components/dashboard/DumbbellChart.jsx';
import { analysisApi } from '../../services/api/analysisApi.js';
import { formatDate } from '../../utils/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const resource = useAnalysis();
  return <ReportGate resource={resource}>{analysis => <DashboardContent analysis={analysis}/>}</ReportGate>;
}

function DashboardContent({analysis}) {
  const { summary,github,candidate } = analysis; const [error,setError] = useState(''); const [deleting,setDeleting] = useState(false);
  const navigate = useNavigate(); const { reports,forget } = useReports();
  const metrics = [{label:'Skills claimed',value:summary.claimed,icon:Layers,color:'neutral',note:'Extracted from the resume'},{label:'Proven skills',value:summary.proven,icon:CheckCircle2,color:'proven',note:'Meaningful public evidence'},{label:'Partial evidence',value:summary.partial,icon:CircleDashed,color:'partial',note:'Room to strengthen the signals'},{label:'Claimed-only',value:summary.claimedOnly,icon:MinusCircle,color:'neutral',note:'Evidence not yet found'}];
  async function remove() {
    if (!window.confirm('Delete this report, its stored resume, and linked job analyses? This cannot be undone.')) return;
    setDeleting(true);
    try {await analysisApi.remove(analysis._id); for (const job of reports.filter(r => r.analysisId === analysis._id)) forget('job',job.id); forget('analysis',analysis._id); navigate('/reports');}
    catch(e){setError(e.message); setDeleting(false);}
  }
  return <><PageHeading eyebrow="The work behind the words" title="Candidate overview" description="A connected view of resume claims and public repository evidence." action={<ExportKey id={analysis._id} type="analysis"/>}/>
    <section className="candidate-banner mb-6"><div className="flex flex-wrap items-center gap-4"><div className="flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 font-display text-2xl font-bold text-lime">{(candidate.name || github.login).slice(0,2).toUpperCase()}</div><div><h2 className="text-xl font-bold text-white">{candidate.name || github.name || github.login}</h2><ExternalLink href={github.url} className="mt-2 text-xs text-[#c1d1bd]"><Github size={13}/>@{github.login}</ExternalLink><p className="mt-2 text-[11px] text-[#a7bda4]">Analyzed {formatDate(analysis.completedAt)}</p></div></div><div className="flex flex-wrap items-center gap-6"><div className="border-l border-white/20 pl-5"><p className="font-display text-2xl font-bold text-lime">{summary.repositoriesAnalyzed}</p><p className="mt-1 text-[10px] text-[#c1d1bd]">Repositories inspected</p></div><Link to={`/jobs?analysis=${analysis._id}`} className="btn btn-lime text-xs"><BriefcaseBusiness size={16}/>Match to a role<ArrowUpRight size={14}/></Link></div></section>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{metrics.map(({label,value,icon:Icon,color,note}) => <article className="panel p-5" key={label}><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted">{label}</p><span className={`metric-icon metric-${color}`}><Icon size={16}/></span></div><p className="my-3 font-display text-3xl font-bold tracking-tight">{value}</p><p className="text-[10px] text-muted">{note}</p></article>)}</div>
    <div className="mb-6 grid items-stretch gap-6 xl:grid-cols-[1fr_.8fr]"><OverviewChart summary={summary}/><div className="panel flex flex-col justify-between p-6"><div><p className="eyebrow mb-3">Beyond the resume</p><h2 className="text-xl font-bold">Let the repositories add context.</h2><p className="muted mt-3">We found <strong className="font-semibold text-ink">{summary.discovered} additional {summary.discovered === 1 ? 'skill' : 'skills'}</strong> with direct GitHub signals that weren’t listed in the resume. These are available in the skill report and job matching.</p></div><Link to={`/analysis/${analysis._id}/skills`} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold">Explore the complete skill map<ArrowUpRight size={15}/></Link></div></div>
    
    {/* Experience Timeline Dumbbell Chart */}
    <div className="mb-6">
      <DumbbellChart skills={analysis.skills || []} />
    </div>

    {analysis.warnings?.length > 0 && <div className="mb-6"><Note>{analysis.warnings.map((warning,i) => <p key={i}>{warning}</p>)}</Note></div>}
    
    {/* Audit Ledger Discrepancy & Trust Report */}
    <DiscrepancyReport report={analysis.discrepancyReport || []} />

    <SkillTable analysisId={analysis._id} skills={analysis.skills} analysis={analysis} compact/>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]"><section className="panel overflow-hidden"><div className="flex items-center justify-between px-6 py-5"><h2 className="font-bold">Repositories inspected</h2><span className="text-xs text-muted">{analysis.repositories.length} repositories</span></div>{analysis.repositories.map(repo => <RepositoryCard key={repo.fullName} repository={repo}/>)}{!analysis.repositories.length && <p className="muted border-t border-line p-6">No eligible public repositories were found. Private work and forked repositories are outside this report.</p>}</section><section className="panel p-6"><div className="mb-5 flex items-center gap-2"><FileText size={17} className="text-muted"/><h2 className="font-bold">Resume snapshot</h2></div><p className="break-all text-xs text-muted">{analysis.resume.filename} · {analysis.resume.pages} pages</p>{candidate.email && <p className="mt-3 break-all text-sm">{candidate.email}</p>}{candidate.phone && <p className="mt-2 text-sm">{candidate.phone}</p>}{['experience','projects','education','certifications'].map(section => analysis.resume[section]?.length > 0 && <details key={section} className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer text-xs font-semibold capitalize">{section}</summary><ul className="mt-3 space-y-2 text-xs leading-5 text-muted">{analysis.resume[section].map((line,i) => <li key={i}>{line}</li>)}</ul></details>)}<p className="mt-5 text-[11px] leading-5 text-muted">Extracted heuristically from the PDF. Layout and headings can affect accuracy.</p></section></div>
    <div className="mt-6"><Note>Proven means the available signals meet the configured evidence threshold. Repository ownership, declarations, and activity do not independently establish authorship or expertise. <Link to="/methodology" className="underline">See scoring details.</Link></Note></div>{error && <div className="mt-4"><ErrorNotice error={error}/></div>}<div className="no-print mt-6 flex justify-end"><button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted hover:bg-red-50 hover:text-red-700" disabled={deleting} onClick={remove}><Trash2 size={14}/>{deleting ? 'Deleting…' : 'Delete report and resume'}</button></div>
  </>;
}
