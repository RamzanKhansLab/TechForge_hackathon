import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicApi } from '../../services/api/publicApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button } from '../../ui/index.js';
import { FileSpreadsheet, AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, XCircle, Info, ExternalLink } from 'lucide-react';

export default function RequirementMatrix() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokens = searchParams.getAll('t').filter(Boolean);

  const [candidateTokens, setCandidateTokens] = useState(() => {
    return tokens.length > 0 ? tokens : ['5940f081d68367a8', '8818f67b2372dea2'];
  });

  const [jdText, setJdText] = useState(
    'Requirements:\n- Must have experience with React and Docker\n- Required: Node.js, TypeScript\nPreferred: Kubernetes, GraphQL'
  );
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parseToken = (input) => {
    if (!input) return '';
    let trimmed = input.trim();
    if (trimmed.includes('/share/')) trimmed = trimmed.split('/share/')[1];
    if (trimmed.includes('/sheet/')) trimmed = trimmed.split('/sheet/')[1];
    return trimmed.split(/[?#]/)[0].replace(/\/$/, '').trim();
  };

  const runCompare = async (targetTokens, textToCompare) => {
    const validTokens = targetTokens.map(parseToken).filter(Boolean);
    if (!validTokens || validTokens.length === 0) {
      setError('Please provide at least 1 candidate share token or link.');
      return;
    }
    if (!textToCompare || textToCompare.trim().length < 10) {
      setError('Please provide a job description with at least 10 characters.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.compare(validTokens, textToCompare.trim());
      setMatrixData(res.data || res);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeTokens = tokens.length > 0 ? tokens : ['5940f081d68367a8', '8818f67b2372dea2'];
    setCandidateTokens(activeTokens);
    runCompare(activeTokens, jdText);
  }, [searchParams.toString()]);

  const handleUpdateJd = (e) => {
    e.preventDefault();
    const valid = candidateTokens.map(parseToken).filter(Boolean);
    if (valid.length === 0) {
      setError('Please enter at least one candidate share token.');
      return;
    }
    // Update URL query params
    const newParams = new URLSearchParams();
    valid.forEach(t => newParams.append('t', t));
    setSearchParams(newParams);
    runCompare(valid, jdText);
  };

  const updateCandidateToken = (index, val) => {
    const updated = [...candidateTokens];
    updated[index] = val;
    setCandidateTokens(updated);
    setError(null);
  };

  const addCandidateSlot = () => {
    if (candidateTokens.length < 5) {
      setCandidateTokens([...candidateTokens, '']);
    }
  };

  const removeCandidateSlot = (index) => {
    if (candidateTokens.length > 1) {
      const updated = candidateTokens.filter((_, i) => i !== index);
      setCandidateTokens(updated);
    }
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

      {/* Evaluation Form & Candidate Tokens */}
      <div className="border border-rule bg-card p-5 rounded-[2px] space-y-4">
        <form onSubmit={handleUpdateJd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">CANDIDATE SHARE TOKENS</span>
              {candidateTokens.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Candidate #${i + 1} share token or link`}
                    value={t}
                    onChange={e => updateCandidateToken(i, e.target.value)}
                    className="w-full p-2.5 text-xs font-mono border border-rule rounded bg-paper"
                  />
                  {candidateTokens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCandidateSlot(i)}
                      className="text-xs text-ink-3 hover:text-red-700 px-1 font-mono"
                      title="Remove candidate slot"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {candidateTokens.length < 5 && (
                <button
                  type="button"
                  onClick={addCandidateSlot}
                  className="text-[11px] font-mono text-forest hover:underline pt-1 block"
                >
                  + Add another candidate token
                </button>
              )}
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">EVALUATION CRITERIA</span>
              <textarea
                rows={4}
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste Job Description requirements..."
                className="w-full p-3 text-xs font-mono border border-rule rounded bg-paper"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-rule">
            <Button type="submit" variant="primary" disabled={loading} className="text-xs">
              {loading ? 'Evaluating Matrix...' : 'Evaluate Requirement Matrix'}
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
    </div>
  );
}
