import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeContextValue } from '../types/auth.js';
import { ThemeContext } from './theme-context.js';

const STORAGE_KEY = 'atlas-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

function readPreference(): ThemeContextValue['preference'] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function readSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(readSystemTheme);
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => setSystemTheme(readSystemTheme());
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({ preference, setPreference: (p: string) => setPreference(p as typeof preference), theme }), [preference, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
