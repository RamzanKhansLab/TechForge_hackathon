import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * RequireAuth
 * Wraps protected <Route> trees.
 *
 * Props:
 *   role  – optional 'student' | 'recruiter'. If set, also enforces the role.
 *
 * Behaviour:
 *   - While pending (initial /me check): renders null (no flash).
 *   - Not authenticated: redirects to /login?next=<current path>.
 *   - Wrong role: redirects to /login?next=<current path>&role=<required>.
 */
export default function RequireAuth({ children, role }) {
  const { user, pending } = useAuth();
  const location = useLocation();

  if (pending) return null;

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (role && user.role !== role) {
    const params = new URLSearchParams({ next: location.pathname + location.search, role });
    return <Navigate to={`/login?${params}`} replace />;
  }

  return children;
}
