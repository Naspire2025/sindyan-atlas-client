import { useContext } from 'react';
import { ThemeContext } from './theme-context.js';
import type { ThemeContextValue } from '../types/auth.js';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}
