import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, KeyBox } from '../../ui/index.js';
import { ArrowRight, ShieldCheck, FileSpreadsheet, Search, CheckCircle2, Lock } from 'lucide-react';

export default function RecruiterEntry() {
  const navigate = useNavigate();
  const [shareInput, setShareInput] = useState('');
  const [error, setError] = useState(null);

  // Multi-token compare state
  const [compareTokens, setCompareTokens] = useState(['', '']);

  const handleOpenSheet = (e) => {
    e.preventDefault();
    if (!shareInput.trim()) {
      setError('Please paste a share link or share token.');
      return;
    }
    // Extract token from full URL or bare token
    let token = shareInput.trim();
    if (token.includes('/share/')) {
      token = token.split('/share/')[1].split(/[?#]/)[0];
    } else if (token.includes('/sheet/')) {
      token = token.split('/sheet/')[1].split(/[?#]/)[0];
    }
    navigate(`/recruiter/sheet/${encodeURIComponent(token)}`);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    const valid = compareTokens.map(t => {
      let trimmed = t.trim();
      if (trimmed.includes('/share/')) trimmed = trimmed.split('/share/')[1].split(/[?#]/)[0];
      if (trimmed.includes('/sheet/')) trimmed = trimmed.split('/sheet/')[1].split(/[?#]/)[0];
      return trimmed;
    }).filter(Boolean);

    if (valid.length < 2) {
      setError('Please provide at least 2 candidate share tokens to compare.');
      return;
    }

    const query = valid.map(t => `t=${encodeURIComponent(t)}`).join('&');
    navigate(`/recruiter/compare?${query}`);
  };

  const updateCompareToken = (index, value) => {
    const updated = [...compareTokens];
    updated[index] = value;
    setCompareTokens(updated);
  };

  const addCompareSlot = () => {
    if (compareTokens.length < 5) {
      setCompareTokens([...compareTokens, '']);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">RECRUITER & REVIEWER LENS</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">SkillProof Evidence Desk</h1>
        <p className="text-sm text-ink-2 max-w-xl mx-auto leading-relaxed">
          Verify candidate skill claims against public code repositories. Zero recruiter logins, zero candidate ranking, strictly verifiable evidence artifacts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Candidate Sheet Entry */}
        <div className="p-6 border border-rule bg-card rounded-[2px] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="size-10 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h2 className="font-sans font-bold text-lg text-ink">Review Single Candidate</h2>
            <p className="text-xs text-ink-3 leading-relaxed">
              Paste the capability share link provided by the candidate to inspect their verified dossier, trust flags, and codebase artifacts.
            </p>

            <form onSubmit={handleOpenSheet} className="pt-2 space-y-3">
              <input
                type="text"
                placeholder="https://skillproof.app/share/abc123... or bare token"
                value={shareInput}
                onChange={e => { setShareInput(e.target.value); setError(null); }}
                className="w-full p-2.5 text-xs font-mono border border-rule rounded bg-paper"
              />
              <Button type="submit" variant="primary" className="w-full justify-center text-xs">
                <span>Open Evidence Sheet</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </form>
          </div>

          <div className="pt-4 border-t border-rule text-[11px] font-mono text-ink-3 flex items-center gap-1.5">
            <Lock size={12} />
            <span>Capability-based access: no account required.</span>
          </div>
        </div>

        {/* Multi-Candidate Requirement Matrix */}
        <div className="p-6 border border-rule bg-card rounded-[2px] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="size-10 rounded-lg bg-paper border border-rule text-ink flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <h2 className="font-sans font-bold text-lg text-ink">Requirement Matrix</h2>
            <p className="text-xs text-ink-3 leading-relaxed">
              Compare 2 to 5 candidates side-by-side against a Job Description. Strictly non-ranked: shown in the exact order you enter them.
            </p>

            <form onSubmit={handleCompare} className="pt-2 space-y-2">
              {compareTokens.map((t, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Candidate #${i + 1} share token or link`}
                  value={t}
                  onChange={e => { updateCompareToken(i, e.target.value); setError(null); }}
                  className="w-full p-2 text-xs font-mono border border-rule rounded bg-paper"
                />
              ))}

              {compareTokens.length < 5 && (
                <button
                  type="button"
                  onClick={addCompareSlot}
                  className="text-[11px] font-mono text-forest hover:underline pt-1 block"
                >
                  + Add another candidate token
                </button>
              )}

              <Button type="submit" variant="secondary" className="w-full justify-center text-xs mt-3">
                <span>Compare on Matrix</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </form>
          </div>

          <div className="pt-4 border-t border-rule text-[11px] font-mono text-ink-3 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-forest" />
            <span>Ethics compliant: zero ranking, zero hiring predictions.</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-xs font-mono text-red-800 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
