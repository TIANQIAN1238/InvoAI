import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types/invoice';
import { apiRegister, apiLogin, apiGetMe, setToken, clearToken, hasToken } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查已有 token
  useEffect(() => {
    if (hasToken()) {
      apiGetMe()
        .then(data => setUser(data as User))
        .catch(() => {
          clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await apiLogin(email, password);
      setToken(result.token);
      const me = await apiGetMe();
      setUser(me as User);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
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
      const msg = err instanceof Error ? err.message : '注册失败';
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
      // ignore
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, loading, error, login, register, logout, refreshUser, clearError };
}
