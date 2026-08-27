import { createContext } from 'react';
import type { AuthContextValue } from '../types/auth.js';

export const AuthContext = createContext<AuthContextValue | null>(null);
