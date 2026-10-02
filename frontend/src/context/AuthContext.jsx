import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api/authApi.js';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * - Bootstraps CSRF on mount (GET /auth/csrf sets the sp_csrf cookie).
 * - Checks current session via GET /auth/me.
 * - Exposes login(), register(), logout(), refreshUser().
 * - `pending` is true until the initial /me check resolves (prevents flash-of-redirect).
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [pending, setPending] = useState(true);
  const csrfBootstrapped      = useRef(false);

  // Bootstrap CSRF cookie + hydrate current user on mount
  useEffect(() => {
    (async () => {
      try {
        // GET /auth/csrf sets the sp_csrf cookie if absent
        if (!csrfBootstrapped.current) {
          await authApi.csrf();
          csrfBootstrapped.current = true;
        }
        const res = await authApi.me();
        setUser(res?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setPending(false);
      }
    })();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.login({ email, password });
    setUser(res?.user ?? null);
    return res;
  }, []);

  const register = useCallback(async ({ email, password, displayName, role, orgName }) => {
    const res = await authApi.register({ email, password, displayName, role, orgName });
    setUser(res?.user ?? null);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    setUser(null);
  }, []);

  // Called by the silent-refresh interceptor failure path or explicit token rotation
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, pending, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
