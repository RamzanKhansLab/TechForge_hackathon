import { useState } from 'react';
import { Clock3, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jobApi } from '../../services/api/jobApi.js';
import { ErrorNotice } from '../common/UI.jsx';
import { skillLabel } from '../../utils/format.js';
import './TaskCard.css';
export default function TaskCard({task,jobId,onUpdate}) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function update(status) {setBusy(true); setError(''); try{onUpdate(await jobApi.task(jobId,task.skill,status));}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <article className={`task-card ${task.status === 'done' ? 'task-done' : ''}`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="rounded-md bg-[#edf3e5] px-2.5 py-1 text-[10px] font-semibold text-[#638348]">{skillLabel(task.skill)}</span><span className="text-[10px] text-muted">{task.difficulty}</span></div><h3 className="text-base font-bold">{task.title}</h3><p className="muted mt-3">{task.description}</p><div className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Clock3 size={13}/>{task.estimatedTime}</div><details className="mt-5 border-t border-line pt-4" open><summary className="cursor-pointer text-xs font-semibold">Expected output</summary><ul className="mt-3 space-y-2">{task.expectedOutput.map(output => <li className="flex items-start gap-2 text-xs leading-5 text-muted" key={output}><CheckCircle2 size={13} className="mt-1 shrink-0 text-[#a1b48e]"/>{output}</li>)}</ul></details><div className="mt-auto pt-6"><label className="sr-only" htmlFor={`task-${task.skill}`}>Progress for {task.title}</label><select id={`task-${task.skill}`} value={task.status} disabled={busy} onChange={e => update(e.target.value)} className="input py-2 text-xs"><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Completed by me</option></select>{error && <div className="mt-3"><ErrorNotice error={error}/></div>}{task.status === 'done' && <p className="mt-3 text-[11px] leading-5 text-muted">Task completion is self-reported and does not change the evidence score. <Link to="/analyze" className="font-semibold text-forest underline">Run a new analysis <ArrowUpRight size={11} className="inline"/></Link> after publishing your work.</p>}</div></article>;
}
