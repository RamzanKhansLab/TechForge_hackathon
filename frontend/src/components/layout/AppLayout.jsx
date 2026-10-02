import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BookOpen, FlaskConical, Menu, X, ArrowUpRight } from 'lucide-react';
import { Logo } from '../common/UI.jsx';
import './AppLayout.css';

const GENERIC_NAV = [
  { label: 'Methodology', icon: BookOpen,     to: '/methodology', end: true },
  { label: 'UI Kit',      icon: FlaskConical, to: '/ui-kit',      end: true },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-rule bg-card px-5 py-4 lg:hidden">
        <Link to="/"><Logo /></Link>
        <button
          className="rounded-lg p-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside id="sidebar" className={`app-sidebar no-print ${open ? 'sidebar-open' : ''}`}>
        <div className="mb-11 flex items-center justify-between">
          <Link to="/" onClick={() => setOpen(false)}><Logo dark /></Link>
          <button className="p-1 text-white lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="space-y-2">
          {GENERIC_NAV.map(({ label, icon: Icon, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-10">
          <Link
            to="/login"
            className="flex items-center gap-2 text-xs font-mono text-[#9cac9e] hover:text-white"
            onClick={() => setOpen(false)}
          >
            Sign in to your workspace
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>

      <div className="app-content">
        <header className="no-print flex h-14 items-center justify-between gap-4 border-b border-rule bg-card px-5 sm:px-9">
          <Link to="/" className="flex items-baseline gap-2 group">
            <span className="font-display text-xl font-bold tracking-tight text-ink group-hover:opacity-80 transition">SkillProof</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">AUDIT LEDGER</span>
          </Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule rounded-[2px] text-xs font-mono text-ink-2 hover:bg-paper-2 transition">
            Sign in →
          </Link>
        </header>
        <main id="main" className="mx-auto max-w-[1400px] px-5 py-8 sm:px-9 sm:py-10">
          <Outlet />
        </main>
        <footer className="no-print mx-5 flex flex-wrap justify-between gap-2 border-t border-rule py-5 text-[11px] font-mono text-ink-3 sm:mx-9">
          <span>SkillProof · Evidence-backed notarized skill audit. Not a hiring prediction.</span>
          <Link to="/methodology" className="hover:text-ink underline">Methodology &amp; Limits ↗</Link>
        </footer>
      </div>
    </div>
  );
}
