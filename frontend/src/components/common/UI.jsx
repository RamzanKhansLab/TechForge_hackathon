import { ArrowUpRight, AlertCircle, LoaderCircle, SearchX, ShieldCheck, CheckCircle2, CircleDashed, MinusCircle, XCircle } from 'lucide-react';
import { safeUrl } from '../../utils/format.js';
import './UI.css';
export function Logo({dark=false}) { return <span className={`inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-forest'}`}><span className="flex size-9 items-center justify-center rounded-xl bg-lime text-forest"><ShieldCheck size={23}/></span>SkillProof<span className="text-lime">.</span></span>; }
export function Badge({status}) {
  const kind = ['Proven','Verified','completed'].includes(status) ? 'success' : ['Partial','processing','queued'].includes(status) ? 'warning' : ['Gap','failed'].includes(status) ? 'danger' : 'neutral';
  const Icon = {success:CheckCircle2,warning:CircleDashed,danger:XCircle,neutral:MinusCircle}[kind];
  return <span className={`status-badge status-${kind}`}><Icon size={13}/>{status}</span>;
}
export function ExternalLink({href,children,className=''}) { const url = safeUrl(href); return url ? <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${className}`}>{children}<ArrowUpRight size={14}/></a> : <span>{children}</span>; }
export function Loading({text='Loading your report…'}) { return <div className="panel flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-muted" role="status"><LoaderCircle className="animate-spin" size={28}/><p className="text-sm">{text}</p></div>; }
export function ErrorNotice({error,retry}) { return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div><p>{typeof error === 'string' ? error : error?.message || 'Something went wrong.'}</p>{retry && <button className="mt-3 font-bold underline underline-offset-4" onClick={retry}>Try again</button>}</div></div></div>; }
export function EmptyState({title,description,action}) { return <div className="panel flex flex-col items-center px-6 py-14 text-center"><span className="mb-5 rounded-2xl bg-paper p-4 text-muted"><SearchX size={26}/></span><h2 className="text-lg font-bold">{title}</h2><p className="muted mt-2 max-w-md">{description}</p>{action && <div className="mt-6">{action}</div>}</div>; }
export function PageHeading({eyebrow,title,description,action}) { return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div>{eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="muted mt-3 max-w-2xl">{description}</p>}</div>{action}</div>; }
export function Note({children}) { return <div className="flex items-start gap-2.5 rounded-xl border border-line bg-[#f2f4ed] p-4 text-xs leading-relaxed text-muted"><AlertCircle size={16} className="mt-0.5 shrink-0"/><div>{children}</div></div>; }
