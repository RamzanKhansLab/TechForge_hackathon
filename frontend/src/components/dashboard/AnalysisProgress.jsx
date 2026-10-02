import { useState } from 'react';
import { Check, LoaderCircle, Circle, RotateCcw, AlertTriangle, Activity } from 'lucide-react';
import { analysisApi } from '../../services/api/analysisApi.js';
import { ErrorNotice, Note } from '../common/UI.jsx';
import './AnalysisProgress.css';

export default function AnalysisProgress({ analysis, reload }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await analysisApi.retry(analysis._id);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (analysis.status === 'failed') {
    return (
      <div className="panel mx-auto max-w-2xl p-8">
        <h2 className="mb-4 font-display text-2xl font-bold">We couldn’t finish this report.</h2>
        <ErrorNotice error={analysis.error?.message || 'Analysis was interrupted.'}/>
        <p className="muted my-5">Your resume is saved. Retry after the issue is resolved to continue the analysis.</p>
        {error && <ErrorNotice error={error}/>}
        <button className="btn btn-primary mt-4" disabled={busy} onClick={retry}>
          <RotateCcw size={16}/>{busy ? 'Queuing…' : 'Retry analysis'}
        </button>
      </div>
    );
  }

  const events = analysis.events || [];
  const budget = analysis.requestBudget || { totalUsed: 0, remaining: 120 };

  return (
    <div className="panel mx-auto max-w-3xl p-7 sm:p-10 border border-rule bg-card">
      <div className="mb-7 flex items-center justify-between border-b border-rule pb-5">
        <div className="flex items-center gap-4">
          <div className="rounded p-3 bg-paper-2 text-ink">
            <LoaderCircle className="animate-spin" size={24}/>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Following the evidence ledger.</h2>
            <p className="muted mt-1 font-mono text-xs">
              @{analysis.githubUsername} · {analysis.status === 'queued' ? 'Awaiting worker lease' : 'Evidence collection active'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-ink-3">Request budget remaining</p>
          <p className="font-mono text-base font-semibold tabular-nums text-ink">{budget.remaining} / 120</p>
        </div>
      </div>

      {analysis.partialEvidence && (
        <div className="mb-6 rounded border border-partial bg-partial-bg p-4 text-xs text-ink">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={15} className="text-partial"/>
            <span>GitHub Rate Limit Reached — Degraded Graceful Mode</span>
          </div>
          <p className="mt-1">
            {analysis.partialEvidenceReason || 'Public API request budget reached. Analyzing available evidence.'}
            {analysis.rateLimitResetAt && ` Resets at ${new Date(analysis.rateLimitResetAt).toLocaleTimeString()}.`}
          </p>
        </div>
      )}

      <div className="mb-7" role="progressbar" aria-label="Analysis progress" aria-valuenow={analysis.progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="mb-2 flex justify-between text-xs text-ink-2 font-mono">
          <span>PIPELINE PROGRESS</span>
          <span className="tabular-nums">{analysis.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-paper-2">
          <div className="h-full bg-proven transition-[width] duration-300" style={{ width: `${analysis.progress}%` }}/>
        </div>
      </div>

      <div className="mt-6 border-t border-rule pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 font-mono mb-4 flex items-center gap-2">
          <Activity size={14}/> Recorded Pipeline Events
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-ink-3 font-mono italic">Waiting for initial worker event…</p>
        ) : (
          <ul className="space-y-3 font-mono text-xs">
            {events.map((ev, i) => (
              <li key={i} className="flex items-start justify-between border-b border-rule/50 pb-2">
                <div className="flex items-center gap-2.5">
                  {ev.finishedAt ? (
                    <Check size={14} className="text-proven shrink-0"/>
                  ) : (
                    <LoaderCircle size={14} className="animate-spin text-ink-2 shrink-0"/>
                  )}
                  <span className={ev.finishedAt ? 'text-ink' : 'font-semibold text-ink'}>
                    {ev.detail}
                  </span>
                </div>
                <span className="text-ink-3 text-[11px] tabular-nums shrink-0 ml-4">
                  {ev.finishedAt ? 'Completed' : 'Running…'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 border-t border-rule pt-4">
        <Note>
          Events are verified and recorded live on the audit job document. Request caps and ETags bound upstream GitHub API consumption.
        </Note>
      </div>
    </div>
  );
}
