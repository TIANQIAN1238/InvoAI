import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types/invoice';
import { apiRegister, apiLogin, apiGetMe, setToken, clearToken, hasToken } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => hasToken());
  const [error, setError] = useState<string | null>(null);

  // Restore session from existing token.
  useEffect(() => {
    if (!hasToken()) return;

    let cancelled = false;

    apiGetMe()
      .then((data) => {
        if (!cancelled) {
          setUser(data as User);
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await apiLogin(email, password);
      setToken(result.token);
      const me = await apiGetMe();
      setUser(me as User);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await apiRegister(email, password);
      setToken(result.token);
      const me = await apiGetMe();
      setUser(me as User);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiGetMe();
      setUser(me as User);
    } catch {
      // Ignore refresh errors.
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, loading, error, login, register, logout, refreshUser, clearError };
}
