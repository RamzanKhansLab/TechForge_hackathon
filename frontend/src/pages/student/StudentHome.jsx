import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { analysisApi } from '../../services/api/analysisApi.js';
import { Stamp, KeyBox, Leader, FlagNote, Button } from '../../ui/index.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Sparkles, ArrowRight, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, CircleDashed, XCircle, Share2, Copy, Check } from 'lucide-react';

export default function StudentHome() {
  const { id } = useParams();
  const [readiness, setReadiness] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [readinessRes, analysisRes] = await Promise.all([
          coachApi.getReadiness(id),
          analysisApi.get(id)
        ]);
        setReadiness(readinessRes.data || readinessRes);
        setAnalysis(analysisRes.data || analysisRes);
      } catch (err) {
        setError(err.message || 'Failed to load readiness summary.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await analysisApi.reanalyze(id);
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Re-analysis trigger failed.');
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) return <Loading text="Auditing evidence ledger for Coach view..." />;
  if (error) return <ErrorNotice error={error} retry={() => window.location.reload()} />;

  const { claimedCount, provenCount, partialCount, claimedOnlyCount, sentence, fastestWin, hiddenStrengths, freshness, partialEvidence } = readiness;

  // Share helper — works with whatever analysis.shareId is already set
  const shareUrl = analysis?.shareId
    ? `${window.location.origin}/share/${analysis.shareId}`
    : null;

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Share your verified profile ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-rule rounded-[2px] bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded border border-rule bg-paper text-ink-2">
            <Share2 size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Share your verified profile</p>
            <p className="text-xs font-mono text-ink-3 mt-0.5">
              {shareUrl
                ? 'Your profile is public. Copy the link below to send to a recruiter.'
                : 'Enable sharing to get a capability link for recruiters. Click "Get Share Link" above.'}
            </p>
          </div>
        </div>

        {shareUrl ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-sm">
            <input
              readOnly
              value={shareUrl}
              aria-label="Your shareable profile link"
              className="input flex-1 font-mono text-xs py-2 min-w-0"
            />
            <button
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 px-3 py-2 border border-rule bg-paper text-xs font-mono text-ink hover:bg-paper-2 rounded-[2px] transition"
              aria-label="Copy share link"
            >
              {copied ? <Check size={13} className="text-proven" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-ink-3 border border-rule rounded px-3 py-1.5 bg-paper">
            NOT YET SHARED
          </span>
        )}
      </div>

      {/* Partial Evidence Banner if Rate Limited */}
      {partialEvidence?.active && (
        <FlagNote variant="warning" title="Partial Evidence Notice">
          <p>{partialEvidence.reason || 'Evidence collection hit GitHub rate limits. Some repositories were skipped.'}</p>
          {partialEvidence.resetAt && <p className="text-xs mt-1">Rate limit resets at: {new Date(partialEvidence.resetAt).toLocaleTimeString()}</p>}
        </FlagNote>
      )}

      {/* Freshness Banner if repos pushed since last check */}
      {freshness?.stale && (
        <div className="p-4 border border-amber-300 bg-amber-50/70 rounded flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-900 text-sm font-sans">
            <RefreshCw size={16} className="text-amber-700 animate-spin" />
            <span>New commits detected in your repositories since your last audit.</span>
          </div>
          <Button variant="secondary" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? 'Refreshing...' : 'Re-run full audit'}
          </Button>
        </div>
      )}

      {/* Hero Readiness Ledger Box */}
      <div className="border border-rule bg-card p-6 sm:p-8 rounded-[2px] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-rule">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">COACH SUMMARY & EVIDENCE STATUS</span>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink font-bold mt-1">Proof Readiness</h1>
          </div>
          <div className="flex items-center gap-2">
            <Stamp status={provenCount === claimedCount ? 'proven' : provenCount > 0 ? 'partial' : 'claimed_only'} />
          </div>
        </div>

        <div className="py-6">
          <p className="text-lg text-ink font-medium leading-relaxed">
            {sentence}
          </p>
        </div>

        {/* 4 Stat KeyBoxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <KeyBox label="CLAIMED SKILLS" value={claimedCount} annotation="On Resume" />
          <KeyBox label="PROVEN BY CODE" value={provenCount} annotation="Meets threshold" />
          <KeyBox label="PARTIAL EVIDENCE" value={partialCount} annotation="Needs depth" />
          <KeyBox label="CLAIMED ONLY" value={claimedOnlyCount} annotation="0 public artifacts" />
        </div>
      </div>

      {/* Fastest Win Section */}
      {fastestWin && (
        <div className="border border-rule bg-paper p-6 rounded-[2px]">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <Sparkles size={18} className="text-forest" />
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">RECOMMENDED FASTEST WIN</h2>
          </div>
          <p className="text-xs text-ink-3 mb-4">Highest impact on your target roles relative to estimated effort.</p>

          <div className="border border-rule bg-card p-4 rounded flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base text-ink">{fastestWin.label}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  ~{fastestWin.estimatedHours}h effort
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-1.5 max-w-xl">{fastestWin.reason}</p>
              {fastestWin.repoToExtend && (
                <p className="text-xs text-ink-3 mt-1 font-mono">Suggested repo: <span className="text-ink font-medium">{fastestWin.repoToExtend}</span></p>
              )}
            </div>
            <Link to={`/student/${id}/tasks`}>
              <Button variant="primary">
                <span>View Task</span>
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Hidden Strengths Section */}
      {hiddenStrengths && hiddenStrengths.length > 0 && (
        <div className="border border-rule bg-card p-6 rounded-[2px]">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <ShieldCheck size={18} className="text-forest" />
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">UNCLAIMED STRENGTHS FOUND IN CODE</h2>
          </div>
          <p className="text-xs text-ink-3 mb-4">You wrote code for these skills, but did not mention them on your resume!</p>

          <div className="space-y-3">
            {hiddenStrengths.map(hs => (
              <div key={hs.skillId} className="p-3 border border-rule bg-paper rounded flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-sans font-bold text-sm text-ink">{hs.label}</span>
                  <div className="text-[11px] font-mono text-ink-3 mt-1 flex flex-wrap gap-2">
                    <span>Found in: {hs.repos.join(', ')}</span>
                  </div>
                </div>
                <Link to={`/student/${id}/resume`}>
                  <Button variant="secondary" className="text-xs py-1">
                    Add to Resume
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Nav Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <Link to={`/student/${id}/roadmap`} className="p-4 border border-rule bg-card hover:bg-paper transition rounded">
          <span className="font-mono text-[10px] text-ink-3 uppercase">WEEKLY PLAN</span>
          <p className="font-bold text-sm text-ink mt-1">Topological Roadmap →</p>
          <p className="text-xs text-ink-3 mt-1">Pack your skill gap micro-tasks by available weekly hours.</p>
        </Link>
        <Link to={`/student/${id}/resume`} className="p-4 border border-rule bg-card hover:bg-paper transition rounded">
          <span className="font-mono text-[10px] text-ink-3 uppercase">IMPROVEMENTS</span>
          <p className="font-bold text-sm text-ink mt-1">Resume Fixes (Redline) →</p>
          <p className="text-xs text-ink-3 mt-1">Actionable copy-paste lines to substantiate your bullet points.</p>
        </Link>
        <Link to={`/student/${id}/roles`} className="p-4 border border-rule bg-card hover:bg-paper transition rounded">
          <span className="font-mono text-[10px] text-ink-3 uppercase">ROLE ALIGNMENT</span>
          <p className="font-bold text-sm text-ink mt-1">Target Roles & Multi-Match →</p>
          <p className="text-xs text-ink-3 mt-1">Compare gap overlaps across target job descriptions.</p>
        </Link>
      </div>
    </div>
  );
}
