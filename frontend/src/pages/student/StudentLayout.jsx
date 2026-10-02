import { useState, useEffect } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, CheckSquare,
  Target, History, ArrowLeft, Share2, ExternalLink,
} from 'lucide-react';
import ShareModal from '../../components/dashboard/ShareModal.jsx';
import { analysisApi } from '../../services/api/analysisApi.js';

export default function StudentLayout() {
  const { id } = useParams();
  const [shareOpen, setShareOpen]   = useState(false);
  const [analysis,  setAnalysis]    = useState(null);

  // Load the analysis so ShareModal has isPublic / shareId
  useEffect(() => {
    analysisApi.get(id)
      .then(res => setAnalysis(res?.data ?? res))
      .catch(() => {/* non-fatal — share button will still open but toggle may fail */});
  }, [id]);

  const tabs = [
    { label: 'Readiness',    to: `/student/${id}`,         end: true, icon: LayoutDashboard },
    { label: 'Roadmap',      to: `/student/${id}/roadmap`,            icon: Calendar },
    { label: 'Micro-Tasks',  to: `/student/${id}/tasks`,              icon: CheckSquare },
    { label: 'Resume Fixes', to: `/student/${id}/resume`,             icon: FileText },
    { label: 'Target Roles', to: `/student/${id}/roles`,              icon: Target },
    { label: 'History',      to: `/student/${id}/history`,            icon: History },
  ];

  return (
    <div className="space-y-0">
      {/* ── Sub-header: breadcrumb + share CTA ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-card px-1 pb-3 pt-1 mb-0">
        <div className="flex items-center gap-2">
          <Link
            to="/student"
            className="flex items-center justify-center size-7 rounded border border-rule text-ink-3 hover:text-ink hover:bg-paper-2 transition"
            aria-label="Back to My Analyses"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-ink-3 uppercase tracking-widest">COACH LENS</span>
            <span className="text-ink-3">/</span>
            <span className="text-ink font-semibold">{id?.slice(0, 8)}…</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Classic audit view link */}
          <Link
            to={`/analysis/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule bg-paper text-xs font-mono text-ink-2 rounded-[2px] hover:bg-paper-2 transition"
          >
            <ExternalLink size={12} />
            <span>Full Audit View</span>
          </Link>

          {/* Share — prominent */}
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-xs font-mono rounded-[2px] hover:opacity-90 transition"
          >
            <Share2 size={12} />
            <span>Get Share Link</span>
          </button>
        </div>
      </div>

      {/* ── Subtabs ────────────────────────────────────────────────────── */}
      <nav
        aria-label="Coach workspace sections"
        className="flex items-center gap-0 overflow-x-auto border-b border-rule text-xs font-mono mb-6"
      >
        {tabs.map(({ label, to, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2.5 border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-partial text-partial font-semibold bg-partial-bg/30'
                  : 'border-transparent text-ink-3 hover:text-ink hover:bg-paper-2'
              }`
            }
          >
            <Icon size={13} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <Outlet />

      {/* Share modal — gets real analysis object with isPublic/shareId */}
      <ShareModal
        analysis={analysis ?? { _id: id }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
