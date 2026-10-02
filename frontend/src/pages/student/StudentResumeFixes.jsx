import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button } from '../../ui/index.js';
import { ExternalLink } from '../../components/common/UI.jsx';
import { FileText, Check, Copy, AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';

export default function StudentResumeFixes() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    async function loadFixes() {
      try {
        setLoading(true);
        setError(null);
        const res = await coachApi.getResumeFixes(id);
        setData(res.data || res);
      } catch (err) {
        setError(err.message || 'Failed to load resume fixes.');
      } finally {
        setLoading(false);
      }
    }
    loadFixes();
  }, [id]);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) return <Loading text="Evaluating 7 resume discrepancy rules against public evidence..." />;
  if (error) return <ErrorNotice error={error} retry={() => window.location.reload()} />;

  const { fixes = [], summary = {} } = data || {};

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">EVIDENCE-ALIGNED RESUME REDLINE</span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">Resume Fixes</h1>
          <p className="text-xs text-ink-3 mt-1 max-w-xl">
            Deterministic suggestions to align your resume claims with verifiable GitHub evidence. No vague generic advice.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded">
            High priority: {summary.high || 0}
          </span>
          <span className="px-2.5 py-1 bg-paper text-ink-2 border border-rule rounded">
            Total fixes: {fixes.length}
          </span>
        </div>
      </div>

      {fixes.length === 0 ? (
        <div className="p-8 text-center border border-rule bg-card rounded">
          <p className="font-bold text-base text-ink">No resume discrepancies detected!</p>
          <p className="text-xs text-ink-3 mt-1">Your claims match your inspected code evidence.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fixes.map((fix, idx) => (
            <div
              key={idx}
              className={`p-5 border rounded-[2px] bg-card transition ${
                fix.severity === 'high' ? 'border-amber-300' : 'border-rule'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rule/50">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                    fix.severity === 'high'
                      ? 'bg-red-100 text-red-900 border border-red-200'
                      : fix.severity === 'medium'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-paper text-ink-3 border border-rule'
                  }`}>
                    {fix.severity}
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink-2">{fix.type}</span>
                  {fix.skillId && (
                    <span className="font-mono text-[11px] text-ink-3">· Skill: <strong className="text-ink">{fix.skillId}</strong></span>
                  )}
                </div>
                {fix.repo && (
                  <span className="font-mono text-[11px] text-ink-3">Repo: {fix.repo}</span>
                )}
              </div>

              <div className="pt-3 space-y-3">
                <p className="text-sm font-medium text-ink leading-relaxed">{fix.message}</p>

                {/* Resume context snippet if present */}
                {fix.context && (
                  <div className="p-2.5 bg-paper border border-rule rounded text-xs font-mono text-ink-2">
                    <span className="text-[10px] text-ink-3 uppercase block mb-1">CURRENT RESUME SNIPPET:</span>
                    "{fix.context}"
                  </div>
                )}

                {/* Suggested replacement / copy paste */}
                {fix.suggestedText && (
                  <div className="p-3 bg-forest/5 border border-forest/20 rounded">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] uppercase font-bold text-forest flex items-center gap-1">
                        <Lightbulb size={12} />
                        RECOMMENDED BULLET / FIX (CLICK TO COPY)
                      </span>
                      <button
                        onClick={() => copyToClipboard(fix.suggestedText, idx)}
                        className="text-xs font-mono text-forest hover:text-ink flex items-center gap-1"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="font-mono text-xs text-ink whitespace-pre-wrap select-all">
                      {fix.suggestedText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
