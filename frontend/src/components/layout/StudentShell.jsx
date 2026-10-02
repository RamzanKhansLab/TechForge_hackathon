import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen, ChevronRight, LogOut, User, Menu, X,
  FileText, ShieldCheck, BriefcaseBusiness, FolderClock, ScanLine,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './StudentShell.css';

// Primary nav items for the student workspace
const NAV = [
  { label: 'New Analysis',    to: '/analyze',  icon: ScanLine },
  { label: 'Skill Audit',     to: '/student',  icon: ShieldCheck, prefix: '/student' },
  { label: 'Job Matching',    to: '/jobs',     icon: BriefcaseBusiness, prefix: '/jobs' },
  { label: 'Reports',         to: '/reports',  icon: FolderClock },
  { label: 'Methodology',     to: '/methodology', icon: FileText },
];

export default function StudentShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Breadcrumb label from path
  const segment = location.pathname.split('/').filter(Boolean);
  const crumb =
    segment[0] === 'analyze'    ? 'New intake' :
    segment[0] === 'student'    ? 'Coach workspace' :
    segment[0] === 'analysis'   ? 'Candidate dossier' :
    segment[0] === 'jobs'       ? 'Job matching' :
    segment[0] === 'reports'    ? 'Reports' :
    segment[0] === 'methodology'? 'Methodology' : '—';

  return (
    <div className="student-shell">
      <a href="#main" className="student-skip-link">Skip to content</a>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="student-topbar no-print">
        {/* Left: wordmark + breadcrumb */}
        <div className="student-topbar-left">
          <Link to="/student" className="student-wordmark">
            <span className="student-wordmark-title">SkillProof</span>
            <span className="student-wordmark-sub">LAB NOTEBOOK</span>
          </Link>
          <span className="student-breadcrumb-sep" aria-hidden="true">
            <ChevronRight size={14} />
          </span>
          <span className="student-breadcrumb-page">{crumb}</span>
        </div>

        {/* Right: account chip + hamburger on mobile */}
        <div className="student-topbar-right">
          <div className="student-account-chip" title={user?.email}>
            <span className="student-account-avatar" aria-hidden="true">
              {(user?.displayName ?? user?.email ?? 'S').charAt(0).toUpperCase()}
            </span>
            <span className="student-account-name">{user?.displayName || 'Student'}</span>
          </div>
          <button
            className="student-logout-btn"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
          {/* Mobile hamburger */}
          <button
            className="student-hamburger"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="student-nav"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Horizontal tab nav ──────────────────────────────────────────── */}
      <nav
        id="student-nav"
        className={`student-tabnav no-print ${menuOpen ? 'student-tabnav-open' : ''}`}
        aria-label="Student workspace navigation"
      >
        {NAV.map(({ label, to, icon: Icon, prefix }) => (
          <NavLink
            key={to}
            to={to}
            end={!prefix}
            className={({ isActive }) => {
              const active = isActive || (prefix && location.pathname.startsWith(prefix));
              return `student-tablink ${active ? 'student-tablink-active' : ''}`;
            }}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={14} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <main id="main" className="student-body">
        <Outlet />
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="student-footer no-print">
        <span>SkillProof · Evidence-backed skill audit.</span>
        <span className="student-footer-ethics">Not a hiring prediction.</span>
        <Link to="/methodology" className="student-footer-link">Methodology &amp; limits ↗</Link>
      </footer>
    </div>
  );
}
