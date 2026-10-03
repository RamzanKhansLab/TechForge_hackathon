import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ShieldCheck, FileSpreadsheet, GitCompare,
  LogOut, Menu, X, ChevronRight, Scale,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './RecruiterShell.css';

const NAV = [
  { label: 'Evidence Desk',      to: '/recruiter', icon: ShieldCheck, end: true },
  { label: 'Requirement Matrix', to: '/recruiter/compare', icon: GitCompare },
  { label: 'Methodology',        to: '/methodology', icon: Scale },
];

export default function RecruiterShell() {
  const { user, logout } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();

  const crumb =
    location.pathname.startsWith('/recruiter/sheet')   ? 'Evidence Sheet' :
    location.pathname.startsWith('/recruiter/compare') ? 'Requirement Matrix' :
    location.pathname === '/recruiter'                 ? 'Case Desk' :
    location.pathname === '/methodology'               ? 'Methodology' : '—';

  return (
    <div className="rec-shell">
      <a href="#main" className="rec-skip-link">Skip to content</a>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="rec-mobile-bar no-print">
        <Link to="/recruiter" className="rec-wordmark">
          <span className="rec-wordmark-title">SkillProof</span>
          <span className="rec-wordmark-sub">CASE DESK</span>
        </Link>
        <button
          className="rec-hamburger"
          aria-label={sideOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sideOpen}
          aria-controls="rec-sidebar"
          onClick={() => setSideOpen(v => !v)}
        >
          {sideOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Overlay (mobile) ────────────────────────────────────────────── */}
      {sideOpen && (
        <button
          className="rec-overlay"
          aria-label="Close navigation"
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        id="rec-sidebar"
        className={`rec-sidebar no-print ${sideOpen ? 'rec-sidebar-open' : ''}`}
      >
        {/* Wordmark */}
        <div className="rec-sidebar-head">
          <Link to="/recruiter" className="rec-wordmark" onClick={() => setSideOpen(false)}>
            <span className="rec-wordmark-title">SkillProof</span>
            <span className="rec-wordmark-sub">CASE DESK</span>
          </Link>
          <button
            className="rec-sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSideOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="rec-sidebar-rule" aria-hidden="true" />

        {/* Nav */}
        <nav aria-label="Recruiter navigation" className="rec-nav">
          <span className="rec-nav-section">MODULES</span>
          {NAV.map(({ label, to, icon: Icon, end, prefix }) => (
            <NavLink
              key={to}
              to={to}
              end={end && !prefix}
              className={({ isActive }) => {
                const active = isActive || (prefix && location.pathname.startsWith(prefix));
                return `rec-navlink ${active ? 'rec-navlink-active' : ''}`;
              }}
              onClick={() => setSideOpen(false)}
            >
              <Icon size={15} className="rec-navlink-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Account block at bottom */}
        <div className="rec-sidebar-foot">
          <div className="rec-account">
            <div className="rec-account-avatar" aria-hidden="true">
              {(user?.displayName ?? user?.email ?? 'R').charAt(0).toUpperCase()}
            </div>
            <div className="rec-account-info">
              <p className="rec-account-name">{user?.displayName || 'Recruiter'}</p>
              <p className="rec-account-org">{user?.orgName || user?.email || ''}</p>
            </div>
          </div>
          <button className="rec-logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="rec-content">
        {/* Slim content header / breadcrumb */}
        <header className="rec-contentheader no-print">
          <div className="rec-breadcrumb">
            <span className="rec-breadcrumb-root">EVIDENCE DESK</span>
            <ChevronRight size={12} className="rec-breadcrumb-sep" />
            <span className="rec-breadcrumb-page">{crumb.toUpperCase()}</span>
          </div>
        </header>

        <main id="main" className="rec-body">
          <Outlet />
        </main>

        <footer className="rec-footer no-print">
          <span>SkillProof · Stateless evidence verification.</span>
          <span className="rec-footer-ethics">No candidate ranking. No hire predictions.</span>
          <Link to="/methodology" className="rec-footer-link">Methodology ↗</Link>
        </footer>
      </div>
    </div>
  );
}
