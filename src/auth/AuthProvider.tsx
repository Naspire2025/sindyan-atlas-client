import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setSessionToken, setUnauthorizedHandler } from '../api/client.js';
import type { AuthContextValue } from '../types/auth.js';
import type { User } from '../types/api.js';
import { AuthContext } from './auth-context.js';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthState {
  status: 'checking' | 'authenticated' | 'unauthenticated' | 'error';
  user: User | null;
  error: string;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking', user: null, error: '' });
  const establishedRef = useRef(false);

  const showUnauthenticated = useCallback((error = '') => {
    setSessionToken(null);
    queryClient.clear();
    setAuthState({ status: 'unauthenticated', user: null, error });
  }, [queryClient]);

  const establishSession = useCallback((user: User) => {
    establishedRef.current = true;
    setAuthState({ status: 'authenticated', user, error: '' });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { user } = await api.getCurrentUser();
      establishSession(user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      setAuthState({ status: 'error', user: null, error: 'Atlas could not confirm your session. Please try again.' });
    }
  }, [establishSession]);

  useEffect(() => {
    setUnauthorizedHandler(async (error?: ApiError) => {
      if (establishedRef.current) {
        showUnauthenticated(error?.message ?? 'Your session could not be established. Please sign in again.');
      } else {
        showUnauthenticated();
      }
    });
    void Promise.resolve().then(refreshSession);
    return () => setUnauthorizedHandler(null);
  }, [refreshSession, showUnauthenticated]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const session = await api.login(credentials);
    setSessionToken(session.token);
    establishSession(session.user);
  }, [establishSession]);

  const acceptInvitation = useCallback(async (token: string, password: string) => {
    const session = await api.acceptInvitation(token, { password });
    setSessionToken(session.token);
    establishSession(session.user);
  }, [establishSession]);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { establishedRef.current = false; showUnauthenticated(); }
  }, [showUnauthenticated]);

  const value = useMemo<AuthContextValue>(() => ({ ...authState, acceptInvitation, login, logout, refreshSession }), [acceptInvitation, authState, login, logout, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}