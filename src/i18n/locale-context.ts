import { createContext } from 'react';
import type { SupportedLocale, LocaleMetadata } from './locale.js';

export interface LocaleContextValue {
  locale: SupportedLocale;
  metadata: LocaleMetadata;
  setLocale: (locale: SupportedLocale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
