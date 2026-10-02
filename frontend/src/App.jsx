import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import StudentShell from './components/layout/StudentShell.jsx';
import RecruiterShell from './components/layout/RecruiterShell.jsx';
import RequireAuth from './components/common/RequireAuth.jsx';
import { Loading } from './components/common/UI.jsx';
import './App.css';
const Landing = lazy(() => import('./pages/Landing/Landing.jsx'));
const LoginPage = lazy(() => import('./pages/Login/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage.jsx'));
const Analyze = lazy(() => import('./pages/Analyze/Analyze.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Skills = lazy(() => import('./pages/Skills/Skills.jsx'));
const SkillDetail = lazy(() => import('./pages/SkillDetail/SkillDetail.jsx'));
const Jobs = lazy(() => import('./pages/Jobs/Jobs.jsx'));
const JobDetail = lazy(() => import('./pages/JobDetail/JobDetail.jsx'));
const Reports = lazy(() => import('./pages/Reports/Reports.jsx'));
const Methodology = lazy(() => import('./pages/Methodology/Methodology.jsx'));
const UiKitShowcase = lazy(() => import('./pages/UiKit/UiKitShowcase.jsx'));
const SharedProfile = lazy(() => import('./pages/SharedProfile/SharedProfile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound.jsx'));

// Student / Coach lens (S3)
const StudentEntry = lazy(() => import('./pages/student/StudentEntry.jsx'));
const StudentLayout = lazy(() => import('./pages/student/StudentLayout.jsx'));
const StudentHome = lazy(() => import('./pages/student/StudentHome.jsx'));
const StudentRoadmap = lazy(() => import('./pages/student/StudentRoadmap.jsx'));
const StudentTasks = lazy(() => import('./pages/student/StudentTasks.jsx'));
const StudentTaskWorkspace = lazy(() => import('./pages/student/StudentTaskWorkspace.jsx'));
const StudentResumeFixes = lazy(() => import('./pages/student/StudentResumeFixes.jsx'));
const StudentRoles = lazy(() => import('./pages/student/StudentRoles.jsx'));
const StudentHistory = lazy(() => import('./pages/student/StudentHistory.jsx'));

// Recruiter / Evidence lens (S4)
const RecruiterEntry = lazy(() => import('./pages/recruiter/RecruiterEntry.jsx'));
const EvidenceSheet = lazy(() => import('./pages/recruiter/EvidenceSheet.jsx'));
const RequirementMatrix = lazy(() => import('./pages/recruiter/RequirementMatrix.jsx'));

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0,0); document.title = `${pathname === '/' ? 'Evidence over claims' : pathname === '/login' ? 'Sign in' : pathname === '/register' ? 'Create account' : pathname.startsWith('/student') ? 'Coach Lens' : pathname.startsWith('/recruiter') ? 'Evidence Desk' : pathname === '/ui-kit' ? 'Audit Ledger UI Kit' : pathname.startsWith('/jobs') ? 'Job matching' : pathname === '/analyze' ? 'Analyze a candidate' : pathname.startsWith('/share') ? 'Verified Candidate Ledger' : 'Your evidence workspace'} · SkillProof`; },[pathname]);
  return (
    <Suspense fallback={<div className="p-8"><Loading text="Opening SkillProof…"/></div>}>
      <Routes>
        {/* ── Public / unauthenticated ───────────────────────── */}
        <Route path="/" element={<Landing/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<RegisterPage/>}/>

        {/* ── Lean shell: open generic routes ───────────────── */}
        <Route element={<AppLayout/>}>
          <Route path="/ui-kit" element={<UiKitShowcase/>}/>
          <Route path="/methodology" element={<Methodology/>}/>
          <Route path="/share/:shareId" element={<SharedProfile/>}/>
          <Route path="*" element={<NotFound/>}/>
        </Route>

        {/* ── Student / Coach Lens shell ─────────────────────── */}
        <Route element={<RequireAuth role="student"><StudentShell/></RequireAuth>}>
          <Route path="/analyze" element={<Analyze/>}/>
          <Route path="/analysis/:id" element={<Dashboard/>}/>
          <Route path="/analysis/:id/skills" element={<Skills/>}/>
          <Route path="/analysis/:id/skills/:skill" element={<SkillDetail/>}/>
          <Route path="/jobs" element={<Jobs/>}/>
          <Route path="/jobs/:id" element={<JobDetail/>}/>
          <Route path="/reports" element={<Reports/>}/>
          <Route path="/student" element={<StudentEntry/>}/>
          <Route path="/student/:id" element={<StudentLayout/>}>
            <Route index element={<StudentHome/>}/>
            <Route path="roadmap" element={<StudentRoadmap/>}/>
            <Route path="tasks" element={<StudentTasks/>}/>
            <Route path="tasks/:taskId" element={<StudentTaskWorkspace/>}/>
            <Route path="resume" element={<StudentResumeFixes/>}/>
            <Route path="roles" element={<StudentRoles/>}/>
            <Route path="history" element={<StudentHistory/>}/>
          </Route>
        </Route>

        {/* ── Recruiter / Case Desk shell ───────────────────── */}
        <Route element={<RequireAuth role="recruiter"><RecruiterShell/></RequireAuth>}>
          <Route path="/recruiter" element={<RecruiterEntry/>}/>
          <Route path="/recruiter/sheet/:token" element={<EvidenceSheet/>}/>
          <Route path="/recruiter/compare" element={<RequirementMatrix/>}/>
        </Route>
      </Routes>
    </Suspense>
  );
}
