import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const requiredRole = params.get('role');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login({ email: email.trim().toLowerCase(), password });
      const user = res?.user;
      if (requiredRole && user?.role !== requiredRole) {
        setError(`This page requires a ${requiredRole} account. You are logged in as a ${user?.role}.`);
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">SIGN IN</span>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded border border-rule bg-card text-ink-2">
                <Lock size={15} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">AUTHENTICATED ACCESS</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Sign in</h1>
            <p className="text-sm text-ink-2">
              {requiredRole === 'recruiter'
                ? 'Recruiter account required to access the Evidence Desk.'
                : requiredRole === 'student'
                ? 'Student account required to access the Coach workspace.'
                : 'Access your SkillProof workspace.'}
            </p>
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
              <label htmlFor="login-email" className="label">Email address</label>
              <input
                id="login-email"
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

            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Your password"
                disabled={busy}
              />
            </div>

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="btn btn-primary w-full"
            >
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRight size={16} className="ml-1" />}
            </button>
          </form>

          {/* Footer links */}
          <p className="text-center text-xs font-mono text-ink-3">
            No account yet?{' '}
            <Link
              to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-link underline hover:opacity-80"
            >
              Register →
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
