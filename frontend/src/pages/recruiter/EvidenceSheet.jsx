import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi } from '../../services/api/publicApi.js';
import { Loading, ErrorNotice, ExternalLink } from '../../components/common/UI.jsx';
import { Stamp, Button, KeyBox, FlagNote } from '../../ui/index.js';
import { ShieldCheck, GitCommit, FileText, CheckCircle2, CircleDashed, XCircle, Search, ExternalLink as ExtIcon, AlertTriangle, HelpCircle } from 'lucide-react';

export default function EvidenceSheet() {
  const { token } = useParams();
  const [profile, setProfile] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Instant stateless JD match state
  const [jdText, setJdText] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState(null);

  // Selected skill drawer / modal info
  const [activeEvidenceSkill, setActiveEvidenceSkill] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // Use the unauthenticated /share/:shareId route — works for any user role.
        // The recruiter-only /public/:token route is attempted for extra summary data
        // but silently skipped if the viewer doesn't have the recruiter role.
        const profileRes = await publicApi.getSharedView(token);
        setProfile(profileRes.data || profileRes);
        // Recruiter-enhanced summary (optional — ignore role/auth errors)
        publicApi.getSummary(token)
          .then(r => { if (r) setSummaryData(r.data || r); })
          .catch(() => null);
      } catch (err) {
        setError(err.message || 'This candidate share link is invalid, private, or has been revoked.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const handleMatchJd = async (e) => {
    e.preventDefault();
    if (!jdText.trim() || jdText.trim().length < 10) {
      setMatchError('Please enter a JD with at least 10 characters.');
      return;
    }
    try {
      setMatchLoading(true);
      setMatchError(null);
      const res = await publicApi.matchJd(token, jdText.trim());
      setMatchResult(res.data || res);
    } catch (err) {
      setMatchError(err.message || 'Failed to match candidate against JD.');
    } finally {
      setMatchLoading(false);
    }
  };

  if (loading) return <Loading text="Loading verified candidate evidence sheet..." />;
  if (error) return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
      <div className="p-8 border border-red-200 bg-red-50 rounded text-red-900">
        <AlertTriangle size={32} className="mx-auto mb-2 text-red-700" />
        <h2 className="font-bold text-lg">Report Unavailable</h2>
        <p className="text-xs mt-1 text-red-800">{error}</p>
        <p className="text-xs mt-3 text-red-700 font-mono">The candidate may have made this report private or expired the share link.</p>
      </div>
      <Link to="/recruiter">
        <Button variant="secondary" className="text-xs">
          ← Return to Evidence Desk
        </Button>
      </Link>
    </div>
  );

  const { githubUsername, candidate, summary = {}, skills = [], repositories = [], discrepancyReport = [], completedAt, createdAt } = profile || {};
  const displayName = candidate?.name || githubUsername || 'Candidate';
  const handle = githubUsername || profile.github?.login;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Top Banner / Consent Note */}
      <div className="p-3.5 border border-forest/30 bg-forest/5 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-forest">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>OFFICIAL CANDIDATE EVIDENCE DOSSIER · SHARED WITH YOUR REVIEW TEAM</span>
        </div>
        <span className="text-[11px] text-ink-3">Not a hiring prediction · Public Code Signals</span>
      </div>

      {/* Header Profile Box */}
      <div className="border border-rule bg-card p-6 sm:p-8 rounded-[2px]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-rule">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">VERIFIED CANDIDATE LEDGER</span>
            <h1 className="font-serif text-3xl font-bold text-ink mt-1">{displayName}</h1>
            <p className="font-mono text-xs text-ink-3 mt-1">
              GitHub: <a href={`https://github.com/${handle}`} target="_blank" rel="noreferrer" className="text-forest hover:underline">@{handle} ↗</a>
              <span className="mx-2">·</span>
              Audited: {new Date(completedAt || createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Stamp status={summary.proven === summary.claimed ? 'proven' : summary.proven > 0 ? 'partial' : 'claimed_only'} />
          </div>
        </div>

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <KeyBox label="PROVEN SKILLS" value={summary.proven ?? 0} annotation="Direct code artifacts" />
          <KeyBox label="PARTIAL EVIDENCE" value={summary.partial ?? 0} annotation="Some code presence" />
          <KeyBox label="CLAIMED ONLY" value={summary.claimedOnly ?? 0} annotation="Zero code evidence" />
          <KeyBox label="REPOSITORIES" value={repositories.length} annotation="Inspected & parsed" />
        </div>
      </div>

      {/* Interactive Stateless JD Match Tool for Recruiters */}
      <div className="border border-rule bg-card p-6 rounded-[2px] space-y-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">INSTANT VERIFICATION MATCH</span>
          <h2 className="font-serif text-xl font-bold text-ink mt-0.5">Match Against Your Job Description</h2>
          <p className="text-xs text-ink-3 mt-1">
            Paste your job requirements to see how this candidate's proven skills map to your criteria. Fully stateless: nothing is saved or ranked.
          </p>
        </div>

        <form onSubmit={handleMatchJd} className="space-y-3">
          <textarea
            rows={3}
            placeholder="Paste your job description requirements (e.g. 'Must have experience with React, TypeScript, and Docker. Preferred: Kubernetes, GraphQL')..."
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            className="w-full p-3 text-xs font-mono border border-rule rounded bg-paper"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={matchLoading} className="text-xs">
              {matchLoading ? 'Evaluating against public evidence...' : 'Match Candidate Against JD'}
            </Button>
          </div>
        </form>

        {matchError && <p className="text-xs text-red-600 font-mono">{matchError}</p>}

        {/* Stateless Match Outcome */}
        {matchResult && (
          <div className="p-5 border border-forest/20 bg-forest/5 rounded-[2px] space-y-4 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/20 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-forest uppercase">MATCH COVERAGE</span>
                <p className="text-2xl font-serif font-bold text-ink">{matchResult.coverage}% of required skills verified</p>
              </div>
              <div className="font-mono text-xs text-ink-3">
                {matchResult.summary.verified} verified · {matchResult.summary.partial} partial · {matchResult.summary.gaps} gaps
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono text-ink-3 uppercase block">SKILL BREAKDOWN:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchResult.requirements.map(req => (
                  <div key={req.skillId} className="p-2.5 border border-rule bg-card rounded flex flex-col justify-between text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{req.label}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        req.verdict === 'Proven' ? 'bg-emerald-100 text-emerald-900' :
                        req.verdict === 'Partial' ? 'bg-amber-100 text-amber-900' :
                        'bg-red-100 text-red-900'
                      }`}>
                        {req.verdict}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-1">{req.explanation}</p>
                    {req.evidenceLinks?.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-rule/50 flex flex-wrap gap-2 text-[10px] font-mono">
                        {req.evidenceLinks.slice(0, 2).map((link, lidx) => (
                          <a key={lidx} href={link} target="_blank" rel="noreferrer" className="text-forest hover:underline">
                            View GitHub Artifact ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink-3 pt-2 border-t border-forest/20">
              {matchResult.consentNote}
            </p>
          </div>
        )}
      </div>

      {/* Discrepancy Findings & Red Flags */}
      {discrepancyReport.length > 0 && (
        <div className="border border-rule bg-card p-6 rounded-[2px] space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">DISCREPANCY FINDINGS</h2>
          </div>
          <div className="space-y-3">
            {discrepancyReport.map((disc, idx) => (
              <div key={idx} className="p-3 border border-rule bg-paper rounded flex items-start gap-3 text-xs">
                <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
                  disc.severity === 'high' ? 'bg-red-100 text-red-900 border border-red-200' :
                  disc.severity === 'medium' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                  'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {disc.severity}
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-ink">{disc.message}</p>
                  {disc.evidenceLinks?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                      {disc.evidenceLinks.map((url, uidx) => (
                        <a key={uidx} href={url} target="_blank" rel="noreferrer" className="text-forest hover:underline">
                          Inspected source file ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Skills Ledger & "Verify Yourself" Instructions */}
      <div className="border border-rule bg-card p-6 rounded-[2px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rule">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Verified Skills Ledger</h2>
            <p className="text-xs text-ink-3 mt-0.5">Click any skill to inspect the step-by-step verification instructions.</p>
          </div>
          <span className="font-mono text-xs text-ink-3">{skills.length} skills indexed</span>
        </div>

        <div className="divide-y divide-rule">
          {skills.map(s => (
            <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-paper/40 px-2 rounded transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sans font-bold text-sm text-ink">{s.label || s.name}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                    s.verdict === 'Proven' ? 'bg-emerald-100 text-emerald-900' :
                    s.verdict === 'Partial' ? 'bg-amber-100 text-amber-900' :
                    'bg-paper text-ink-3 border border-rule'
                  }`}>
                    {s.verdict}
                  </span>
                  {s.claimed && (
                    <span className="text-[10px] font-mono text-ink-3 border border-rule px-1 rounded">
                      Resume Claim
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-mono text-ink-3">
                  <span>Score: {s.score || 0}/100</span>
                  <span>Artifacts: {s.evidence?.length || 0}</span>
                  {s.repositories?.length > 0 && <span>Repos: {s.repositories.join(', ')}</span>}
                </div>
              </div>

              {s.evidence?.length > 0 && (
                <button
                  onClick={() => setActiveEvidenceSkill(activeEvidenceSkill?.id === s.id ? null : s)}
                  className="text-xs font-mono text-forest hover:text-ink underline flex items-center gap-1"
                >
                  <HelpCircle size={13} />
                  <span>{activeEvidenceSkill?.id === s.id ? 'Hide Instructions' : 'Verify Yourself'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded "Verify Yourself" Drawer */}
      {activeEvidenceSkill && (
        <div className="p-6 border-2 border-forest bg-card rounded-[2px] space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-forest" />
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">
                HOW TO INDEPENDENTLY VERIFY EVIDENCE FOR: {activeEvidenceSkill.label || activeEvidenceSkill.name}
              </h3>
            </div>
            <button
              onClick={() => setActiveEvidenceSkill(null)}
              className="font-mono text-xs text-ink-3 hover:text-ink"
            >
              [Close]
            </button>
          </div>

          <p className="text-xs text-ink-2">
            SkillProof operates deterministically. Any reviewer or engineering lead can verify this evidence by checking these steps:
          </p>

          <div className="space-y-3">
            {(activeEvidenceSkill.evidence || []).map((e, idx) => (
              <div key={idx} className="p-3.5 border border-rule bg-paper rounded space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-forest">ARTIFACT #{idx + 1}: {e.kind || e.type || 'code'}</span>
                  {e.repo && <span className="text-ink-3">Repo: {e.repo}</span>}
                </div>
                <p className="text-xs text-ink leading-relaxed">
                  Open <span className="font-mono font-bold text-ink">{e.repo || 'the repository'}</span> on GitHub and inspect <span className="font-mono text-forest">{e.path || e.file || 'relevant file'}</span>.
                </p>
                {e.url && (
                  <div className="pt-1">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-forest hover:underline"
                    >
                      Direct GitHub link: {e.url} ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent & Ethics Footer */}
      <footer className="pt-6 border-t border-rule text-xs font-mono text-ink-3 space-y-1">
        <p>Consent Notice: This report was made public by the candidate via a capability link.</p>
        <p>Evidence is compiled purely from public GitHub data and resume text. Not a hiring recommendation or prediction.</p>
      </footer>
    </div>
  );
}
