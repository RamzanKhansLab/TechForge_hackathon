import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analysisApi } from '../../services/api/analysisApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Upload, Sparkles, ArrowRight, Share2, FolderOpen,
  Clock, Github, ShieldCheck, AlertCircle, Loader2,
} from 'lucide-react';

function VerdictPill({ value, label, color }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${color}`}>
      {value} {label}
    </span>
  );
}

export default function StudentEntry() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [seeding,  setSeeding]  = useState(false);

  useEffect(() => {
    setLoading(true);
    // GET /api/analysis — returns owned analyses for the authenticated student
    analysisApi.list
      ? analysisApi.list().then(res => setAnalyses(res ?? [])).catch(e => setError(e.message)).finally(() => setLoading(false))
      : setLoading(false);
  }, []);

  async function handleLoadDemo() {
    try {
      setSeeding(true);
      const res = await analysisApi.loadDemo('demo');
      const id  = res?._id ?? res?.data?._id ?? res?.id;
      if (id) navigate(`/student/${id}`);
    } catch (err) {
      alert(err.message || 'Demo seeding failed. Ensure the backend demo route is enabled.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">

      {/* Heading */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
          STUDENT · COACH WORKSPACE
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {user?.displayName ? `Welcome back, ${user.displayName.split(' ')[0]}` : 'Your Lab Notebook'}
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed max-w-xl">
          Upload your resume and GitHub username to audit your claims against public code evidence.
          Each analysis is private to your account.
        </p>
      </div>

      {/* Primary action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New audit */}
        <div className="flex flex-col justify-between border border-rule bg-card rounded-[2px] p-6">
          <div>
            <div className="flex size-10 items-center justify-center rounded border border-rule bg-paper text-ink-2 mb-4">
              <Upload size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">New Audit</h2>
            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Upload a PDF resume + GitHub username. SkillProof deterministically extracts skills
              and collects public repository evidence.
            </p>
          </div>
          <Link to="/analyze" className="mt-6">
            <button className="btn btn-primary w-full justify-center">
              <Upload size={14} />
              <span>Upload Resume</span>
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* Demo */}
        <div className="flex flex-col justify-between border border-rule bg-paper rounded-[2px] p-6">
          <div>
            <div className="flex size-10 items-center justify-center rounded border border-rule bg-card text-ink-3 mb-4">
              <Sparkles size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">Explore a Demo</h2>
            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Load a pre-computed audit to see Proven/Partial/Claimed-only verdicts,
              the weekly roadmap, and resume redlines.
            </p>
          </div>
          <button
            className="btn btn-secondary w-full justify-center mt-6"
            onClick={handleLoadDemo}
            disabled={seeding}
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{seeding ? 'Loading…' : 'Load Sample Audit'}</span>
          </button>
        </div>
      </div>

      {/* Sharing explainer */}
      <div className="border border-rule bg-card rounded-[2px] px-5 py-4 flex items-start gap-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded border border-rule bg-paper text-ink-3">
          <Share2 size={15} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">How to share with recruiters</p>
          <p className="text-xs font-mono text-ink-3 mt-0.5 leading-relaxed">
            Open any audit below → click <strong className="text-ink font-semibold">"Get Share Link"</strong> in the top
            bar → toggle sharing on → copy the <code className="bg-paper-2 px-1 rounded text-[10px]">/share/…</code> link
            and send it. Recruiters open it in their Evidence Desk.
          </p>
        </div>
      </div>

      {/* Owned analyses list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-ink-3" />
          <h2 className="font-mono text-[11px] uppercase tracking-widest font-bold text-ink">
            YOUR ANALYSES
          </h2>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-ink-3 py-6">
            <Loader2 size={14} className="animate-spin" /> Loading your analyses…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 border border-claimed bg-claimed-bg rounded px-4 py-3 text-xs text-claimed">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div className="border border-rule bg-paper rounded-[2px] px-5 py-8 text-center">
            <p className="text-sm text-ink-2">No analyses yet.</p>
            <p className="text-xs font-mono text-ink-3 mt-1">Upload your resume above to create your first audit.</p>
          </div>
        )}

        {analyses.map(a => {
          const proven  = a.summary?.proven  ?? 0;
          const partial = a.summary?.partial ?? 0;
          const claimed = a.summary?.claimed ?? 0;
          const ago = a.createdAt
            ? new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';

          return (
            <div
              key={a._id}
              className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-card rounded-[2px] px-5 py-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Github size={13} className="text-ink-3 shrink-0" />
                  <span className="font-mono font-semibold text-sm text-ink">{a.githubUsername || '—'}</span>
                  {a.isPublic && (
                    <span className="font-mono text-[10px] border border-proven text-proven bg-proven-bg px-1.5 py-0.5 rounded">
                      SHARED
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <VerdictPill value={proven}  label="Proven"  color="border-proven  text-proven  bg-proven-bg" />
                  <VerdictPill value={partial} label="Partial" color="border-partial text-partial bg-partial-bg" />
                  <VerdictPill value={claimed} label="Claimed" color="border-claimed text-claimed bg-claimed-bg" />
                  <span className="font-mono text-[10px] text-ink-3 flex items-center gap-1">
                    <Clock size={10} /> {ago}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {a.isPublic && a.shareId && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${a.shareId}`); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule bg-paper text-xs font-mono text-ink-2 rounded-[2px] hover:bg-paper-2 transition"
                    title="Copy share link"
                  >
                    <Share2 size={12} />
                    Copy link
                  </button>
                )}
                <Link
                  to={`/student/${a._id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-xs font-mono rounded-[2px] hover:opacity-90 transition"
                >
                  <ShieldCheck size={12} />
                  Open Coach
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
