import type { User } from './api.js';

export interface AuthContextValue {
  status: 'checking' | 'authenticated' | 'unauthenticated' | 'error';
  user: User | null;
  error: string;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface ThemeContextValue {
  preference: 'system' | 'dark' | 'light';
  setPreference: (preference: string) => void;
  theme: 'dark' | 'light';
}
