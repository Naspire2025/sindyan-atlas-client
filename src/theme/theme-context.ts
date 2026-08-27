import { createContext } from 'react';
import type { ThemeContextValue } from '../types/auth.js';

export const ThemeContext = createContext<ThemeContextValue | null>(null);
