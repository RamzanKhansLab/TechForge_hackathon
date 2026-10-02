import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisApi } from '../../services/api/analysisApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { History, ArrowRight, GitCommit, CheckCircle2 } from 'lucide-react';

export default function StudentHistory() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const [analysisRes, diffRes] = await Promise.all([
          analysisApi.get(id),
          analysisApi.diff(id)
        ]);
        setAnalysis(analysisRes.data || analysisRes);
        setDiff(diffRes.data || diffRes);
      } catch (err) {
        setError(err.message || 'Failed to load analysis snapshot history.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [id]);

  if (loading) return <Loading text="Fetching evidence snapshot timeline..." />;
  if (error) return <ErrorNotice error={error} retry={() => window.location.reload()} />;

  const events = analysis?.events || [];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">AUDIT TIMELINE & PROGRESS</span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">Snapshot History</h1>
          <p className="text-xs text-ink-3 mt-1 max-w-xl">
            Verifiable progression across re-analyses. Compare evidence growth over time.
          </p>
        </div>
      </div>

      {diff && diff.scoreDelta !== undefined && (
        <div className="p-6 border border-rule bg-card rounded-[2px] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest font-bold text-ink">LAST SNAPSHOT DELTA</span>
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
              diff.scoreDelta >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
            }`}>
              {diff.scoreDelta >= 0 ? `+${diff.scoreDelta}` : diff.scoreDelta} pts
            </span>
          </div>

          {diff.newlyProven?.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-mono text-ink-3 block mb-1">Newly proven skills:</span>
              <div className="flex flex-wrap gap-2">
                {diff.newlyProven.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-paper border border-rule text-xs font-bold text-forest rounded">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events / Pipeline Log */}
      <div className="border border-rule bg-card rounded-[2px] overflow-hidden">
        <div className="bg-paper px-5 py-3 border-b border-rule font-mono text-xs font-bold text-ink">
          VERIFICATION LOG & EVIDENCE EVENTS
        </div>
        <div className="p-5 space-y-4">
          {events.length === 0 ? (
            <p className="text-xs font-mono text-ink-3">No event logs recorded for this case file.</p>
          ) : (
            events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 text-xs font-mono">
                <span className="text-ink-3 shrink-0">{new Date(ev.startedAt).toLocaleTimeString()}</span>
                <span className="text-forest font-bold shrink-0">[{ev.name}]</span>
                <span className="text-ink-2">{ev.detail}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
