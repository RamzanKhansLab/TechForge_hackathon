import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserPlus, ArrowRight, AlertCircle, ShieldCheck, BriefcaseBusiness } from 'lucide-react';

const ROLES = [
  {
    id: 'student',
    label: 'Student / Candidate',
    description: 'Upload your resume, audit your claims, and close skill gaps with a weekly roadmap.',
    icon: ShieldCheck,
  },
  {
    id: 'recruiter',
    label: 'Recruiter / Reviewer',
    description: 'Review verified evidence sheets and run stateless requirement matrices for candidates.',
    icon: BriefcaseBusiness,
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const [role, setRole]               = useState('student');
  const [email, setEmail]             = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName]         = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState(null);
  const [busy, setBusy]               = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        role,
        orgName: role === 'recruiter' ? orgName.trim() : undefined,
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Ledger header strip */}
      <header className="border-b border-rule bg-card px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-ink">SkillProof</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">AUDIT LEDGER</span>
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">CREATE ACCOUNT</span>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Heading */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded border border-rule bg-card text-ink-2">
                <UserPlus size={15} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">NEW ACCOUNT</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Create account</h1>
            <p className="text-sm text-ink-2">Choose your lens. You can only register for one role.</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account role">
            {ROLES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={role === id}
                onClick={() => setRole(id)}
                className={`rounded border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-link ${
                  role === id
                    ? 'border-ink bg-card shadow-sm'
                    : 'border-rule bg-paper hover:border-ink/40'
                }`}
              >
                <Icon size={18} className={role === id ? 'text-ink mb-2' : 'text-ink-3 mb-2'} />
                <p className={`text-xs font-semibold ${role === id ? 'text-ink' : 'text-ink-2'}`}>{label}</p>
                <p className="text-[10px] font-mono text-ink-3 mt-1 leading-relaxed">{description}</p>
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded border border-claimed bg-claimed-bg px-4 py-3 text-sm text-claimed">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className="label">Display name</label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input"
                placeholder="Your full name"
                disabled={busy}
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="label">Email address</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>

            {role === 'recruiter' && (
              <div>
                <label htmlFor="reg-org" className="label">Organisation name</label>
                <input
                  id="reg-org"
                  type="text"
                  autoComplete="organization"
                  required
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="input"
                  placeholder="Acme Corp"
                  disabled={busy}
                />
              </div>
            )}

            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="10+ characters"
                disabled={busy}
              />
              <p className="mt-1.5 text-[11px] font-mono text-ink-3">Must be 10+ characters and not a common password.</p>
            </div>

            <button
              type="submit"
              disabled={busy || !email || !password || !displayName || (role === 'recruiter' && !orgName)}
              className="btn btn-primary w-full"
            >
              {busy ? 'Creating account…' : `Create ${role} account`}
              {!busy && <ArrowRight size={16} className="ml-1" />}
            </button>
          </form>

          {/* Footer links */}
          <p className="text-center text-xs font-mono text-ink-3">
            Already have an account?{' '}
            <Link
              to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-link underline hover:opacity-80"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-rule px-6 py-4 text-center font-mono text-[10px] text-ink-3">
        SkillProof · Evidence-backed skill verification. Not a hiring prediction.
      </footer>
    </div>
  );
}
