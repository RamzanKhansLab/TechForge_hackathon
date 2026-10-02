import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScanLine, ShieldCheck, BriefcaseBusiness, FolderClock, ArrowUpRight, Menu, X, Github, Plus, ChevronRight } from 'lucide-react';
import { Logo, Note } from '../common/UI.jsx';
import { useReports } from '../../context/ReportContext.jsx';
import './AppLayout.css';
export default function AppLayout() {
  const [open,setOpen] = useState(false); const location = useLocation(); const { reports,storageWarning } = useReports();
  const match = location.pathname.match(/^\/analysis\/([a-f\d]{24})/i);
  const current = match?.[1] || reports.find(r => r.type === 'analysis')?.id;
  const navigation = [
    {label:'Overview',icon:LayoutDashboard,to:current ? `/analysis/${current}` : '/reports',end:true},
    {label:'New analysis',icon:ScanLine,to:'/analyze',end:true},
    {label:'Skill verification',icon:ShieldCheck,to:current ? `/analysis/${current}/skills` : '/analyze'},
    {label:'Job matching',icon:BriefcaseBusiness,to:'/jobs'},
    {label:'Saved reports',icon:FolderClock,to:'/reports'},
  ];
  return <div className="min-h-screen"><a href="#main" className="skip-link">Skip to content</a><div className="flex items-center justify-between border-b border-line bg-white px-5 py-4 lg:hidden"><Link to="/"><Logo/></Link><button className="rounded-lg p-2" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
    {open && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside id="sidebar" className={`app-sidebar no-print ${open ? 'sidebar-open' : ''}`}>
      <div className="mb-11 flex items-center justify-between"><Link to="/" onClick={() => setOpen(false)}><Logo dark/></Link><button className="p-1 text-white lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#899c8e]">Your workspace</p>
      <nav aria-label="Main navigation" className="space-y-2">{navigation.map(({label,icon:Icon,to,end}) => <NavLink key={label} to={to} end={end} onClick={() => setOpen(false)} className={({isActive}) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}><Icon size={18}/><span>{label}</span>{label === 'New analysis' && <Plus size={14} className="ml-auto"/>}</NavLink>)}</nav>
      <div className="mt-auto pt-14"><div className="rounded-xl border border-[#405246] bg-[#253a2e] p-4"><div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#3d5137] text-lime"><Github size={18}/></div><p className="text-sm font-semibold text-white">Built on public evidence.</p><p className="mt-2 text-xs leading-relaxed text-[#aab7ad]">Every skill has a story. See the code behind the claim.</p><Link to="/methodology" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-lime" onClick={() => setOpen(false)}>How scoring works<ArrowUpRight size={14}/></Link></div><div className="mt-6 flex items-center gap-3 px-1"><span className="flex size-9 items-center justify-center rounded-full border border-[#4a5c4f] text-xs font-semibold text-[#c8d4c6]">SP</span><div><p className="text-xs font-semibold text-white">SkillProof workspace</p><p className="mt-1 text-[10px] text-[#9cac9e]">Evidence-first hiring</p></div></div></div>
    </aside>
    <div className="app-content">
      <header className="no-print flex h-16 items-center justify-between gap-4 border-b border-rule bg-card px-5 sm:px-9">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-baseline gap-2 group">
            <span className="font-display text-2xl font-bold tracking-tight text-ink group-hover:text-ink/80 transition">
              SkillProof
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
              AUDIT LEDGER
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-rule text-xs font-mono text-ink-3">
            <span>FILE:</span>
            <span className="text-ink font-medium">
              {location.pathname.startsWith('/jobs') ? 'JOB MATCHING' : location.pathname === '/analyze' ? 'NEW INTAKE' : location.pathname === '/reports' ? 'REPORT INDEX' : location.pathname === '/ui-kit' ? 'UI KIT' : 'CANDIDATE DOSSIER'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <Link to="/ui-kit" className="text-ink-3 hover:text-ink transition hidden sm:inline">
            [UI KIT]
          </Link>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper hover:bg-ink/90 rounded-[2px] transition text-xs font-sans font-medium"
          >
            <Plus size={14}/>
            <span>New Case File</span>
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1500px] px-5 py-8 sm:px-9 sm:py-10">
        {storageWarning && <div className="mb-5"><Note>Browser storage is unavailable. Save each report’s access key before closing this tab.</Note></div>}
        <Outlet/>
      </main>
      <footer className="no-print mx-5 flex flex-wrap justify-between gap-2 border-t border-rule py-5 text-[11px] font-mono text-ink-3 sm:mx-9">
        <span>SkillProof · Evidence-backed notarized skill audit. Not a hiring prediction.</span>
        <Link to="/methodology" className="hover:text-ink underline">Methodology & Limits ↗</Link>
      </footer>
    </div>
  </div>;
}
