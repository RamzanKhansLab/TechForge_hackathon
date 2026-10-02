import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicApi } from '../../services/api/publicApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button } from '../../ui/index.js';
import { FileSpreadsheet, AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, XCircle, Info, ExternalLink } from 'lucide-react';

export default function RequirementMatrix() {
  const [searchParams] = useSearchParams();
  const tokens = searchParams.getAll('t').filter(Boolean);

  const [jdText, setJdText] = useState(
    'Requirements:\n- Must have experience with React and Docker\n- Required: Node.js, TypeScript\nPreferred: Kubernetes, GraphQL'
  );
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runCompare = async (textToCompare) => {
    if (!tokens || tokens.length === 0) {
      setError('No candidate share tokens provided in URL (?t=token1&t=token2).');
      return;
    }
    if (!textToCompare || textToCompare.trim().length < 10) {
      setError('Please provide a job description with at least 10 characters.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.compare(tokens, textToCompare.trim());
      setMatrixData(res.data);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokens.length > 0) {
      runCompare(jdText);
    }
  }, []);

  const handleUpdateJd = (e) => {
    e.preventDefault();
    runCompare(jdText);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <Link to="/recruiter" className="inline-flex items-center gap-1 text-xs font-mono text-ink-3 hover:text-ink mb-1">
            <ArrowLeft size={13} />
            Back to Evidence Desk
          </Link>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-forest" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Requirement Matrix</h1>
          </div>
          <p className="text-xs text-ink-3 mt-1">
            Side-by-side evidence matrix comparing candidate skills strictly against your job requirements.
          </p>
        </div>

        {/* Ethics Guardrail Badge */}
        <div className="p-2.5 bg-paper border border-rule rounded text-right font-mono text-[11px] text-ink-3 max-w-xs">
          <span>Non-ranking ledger: Candidates are strictly listed in the order you provided.</span>
        </div>
      </div>

      {tokens.length === 0 ? (
        <div className="p-8 text-center border border-rule bg-card rounded">
          <p className="font-bold text-ink">No candidates selected</p>
          <p className="text-xs text-ink-3 mt-1 mb-4">Add candidate share tokens from the Evidence Desk to compare.</p>
          <Link to="/recruiter">
            <Button variant="primary">Return to Evidence Desk</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Job Description Input Form */}
          <div className="border border-rule bg-card p-5 rounded-[2px] space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">EVALUATION CRITERIA</span>
            <form onSubmit={handleUpdateJd} className="space-y-3">
              <textarea
                rows={3}
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste Job Description requirements..."
                className="w-full p-3 text-xs font-mono border border-rule rounded bg-paper"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={loading} className="text-xs">
                  {loading ? 'Evaluating Matrix...' : 'Re-evaluate Matrix'}
                </Button>
              </div>
            </form>
          </div>

          {error && <ErrorNotice error={error} />}

          {loading && <Loading text="Constructing candidate requirement matrix..." />}

          {!loading && matrixData && (
            <div className="space-y-6">
              {/* Matrix Table */}
              <div className="border border-rule bg-card rounded-[2px] overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-paper border-b border-rule font-mono text-[11px] text-ink-3">
                      <th className="p-3.5 font-bold uppercase tracking-wider min-w-[200px]">Requirement</th>
                      {matrixData.candidates?.map((c, i) => (
                        <th key={c.token} className="p-3.5 font-bold uppercase tracking-wider border-l border-rule min-w-[180px]">
                          <div>
                            <span className="text-ink font-bold block">{c.displayName || `Candidate #${i + 1}`}</span>
                            <span className="text-[10px] text-ink-3 font-normal">
                              {c.coverage !== null ? `${c.coverage}% coverage` : 'Revoked/Error'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-mono">
                    {matrixData.requirements?.map(req => (
                      <tr key={req.skillId} className="hover:bg-paper/30 transition">
                        <td className="p-3.5 font-sans font-medium text-ink">
                          <div className="flex items-center gap-2">
                            <span>{req.label}</span>
                            <span className={`text-[10px] px-1 rounded uppercase ${
                              req.importance === 'required' ? 'bg-amber-100 text-amber-900' : 'bg-paper text-ink-3'
                            }`}>
                              {req.importance}
                            </span>
                          </div>
                        </td>

                        {matrixData.candidates?.map(c => {
                          if (c.error) {
                            return (
                              <td key={c.token} className="p-3.5 border-l border-rule text-red-700 bg-red-50/30 text-[11px]">
                                Unavailable
                              </td>
                            );
                          }
                          const cell = c.cells?.find(cl => cl.skillId === req.skillId);
                          const verdict = cell?.verdict || 'Missing';
                          return (
                            <td key={c.token} className="p-3.5 border-l border-rule">
                              <div className="flex items-center gap-1.5">
                                {verdict === 'Proven' ? (
                                  <CheckCircle2 size={14} className="text-emerald-700" />
                                ) : verdict === 'Partial' ? (
                                  <CircleDashed size={14} className="text-amber-700" />
                                ) : (
                                  <XCircle size={14} className="text-ink-3" />
                                )}
                                <span className={`text-xs font-bold ${
                                  verdict === 'Proven' ? 'text-emerald-900' :
                                  verdict === 'Partial' ? 'text-amber-900' :
                                  'text-ink-3'
                                }`}>
                                  {verdict}
                                </span>
                              </div>

                              {cell?.evidenceLinks?.length > 0 && (
                                <a
                                  href={cell.evidenceLinks[0]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-forest hover:underline block mt-1"
                                >
                                  View artifact ↗
                                </a>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Consent and Ethics Note */}
              <div className="p-4 border border-rule bg-paper rounded text-xs font-mono text-ink-3">
                <p>{matrixData.consentNote}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
