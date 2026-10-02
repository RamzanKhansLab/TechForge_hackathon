import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { Loading } from './components/common/UI.jsx';
import './App.css';
const Landing = lazy(() => import('./pages/Landing/Landing.jsx'));
const Analyze = lazy(() => import('./pages/Analyze/Analyze.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Skills = lazy(() => import('./pages/Skills/Skills.jsx'));
const SkillDetail = lazy(() => import('./pages/SkillDetail/SkillDetail.jsx'));
const Jobs = lazy(() => import('./pages/Jobs/Jobs.jsx'));
const JobDetail = lazy(() => import('./pages/JobDetail/JobDetail.jsx'));
const Reports = lazy(() => import('./pages/Reports/Reports.jsx'));
const Methodology = lazy(() => import('./pages/Methodology/Methodology.jsx'));
const UiKitShowcase = lazy(() => import('./pages/UiKit/UiKitShowcase.jsx'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound.jsx'));
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0,0); document.title = `${pathname === '/' ? 'Evidence over claims' : pathname === '/ui-kit' ? 'Audit Ledger UI Kit' : pathname.startsWith('/jobs') ? 'Job matching' : pathname === '/analyze' ? 'Analyze a candidate' : 'Your evidence workspace'} · SkillProof`; },[pathname]);
  return <Suspense fallback={<div className="p-8"><Loading text="Opening SkillProof…"/></div>}><Routes><Route path="/" element={<Landing/>}/><Route element={<AppLayout/>}><Route path="/ui-kit" element={<UiKitShowcase/>}/><Route path="/analyze" element={<Analyze/>}/><Route path="/analysis/:id" element={<Dashboard/>}/><Route path="/analysis/:id/skills" element={<Skills/>}/><Route path="/analysis/:id/skills/:skill" element={<SkillDetail/>}/><Route path="/jobs" element={<Jobs/>}/><Route path="/jobs/:id" element={<JobDetail/>}/><Route path="/reports" element={<Reports/>}/><Route path="/methodology" element={<Methodology/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></Suspense>;
}
