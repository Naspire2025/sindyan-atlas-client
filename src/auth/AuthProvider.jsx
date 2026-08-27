import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setCsrfToken, setUnauthorizedHandler } from '../api/client.js';
import { AuthContext } from './auth-context.js';

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState({ status: 'checking', user: null, error: '' });

  const setUnauthenticated = useCallback(() => {
    setCsrfToken(null);
    queryClient.clear();
    setAuthState({ status: 'unauthenticated', user: null, error: '' });
  }, [queryClient]);

  const establishSession = useCallback((result) => {
    setCsrfToken(result.csrfToken);
    setAuthState({ status: 'authenticated', user: result.user, error: '' });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { user } = await api.getCurrentUser();
      const { csrfToken: nextCsrfToken } = await api.getCsrfToken();
      establishSession({ user, csrfToken: nextCsrfToken });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      setAuthState({ status: 'error', user: null, error: 'Atlas could not confirm your session. Please try again.' });
    }
  }, [establishSession]);

  useEffect(() => {
    setUnauthorizedHandler(setUnauthenticated);
    void Promise.resolve().then(refreshSession);
    return () => setUnauthorizedHandler(null);
  }, [refreshSession, setUnauthenticated]);

  const login = useCallback(async (credentials) => establishSession(await api.login(credentials)), [establishSession]);
  const acceptInvitation = useCallback(async (token, password) => establishSession(await api.acceptInvitation(token, { password })), [establishSession]);
  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setUnauthenticated(); }
  }, [setUnauthenticated]);
  const value = useMemo(() => ({ ...authState, acceptInvitation, login, logout, refreshSession }), [acceptInvitation, authState, login, logout, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
