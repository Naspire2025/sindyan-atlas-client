import { enMessages } from './messages/en.js';
import { arMessages } from './messages/ar.js';

export type SupportedLocale = 'en' | 'ar';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'ar'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export type LocaleMetadata = {
  locale: SupportedLocale;
  label: string;
  dir: 'ltr' | 'rtl';
};

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    locale: 'en',
    label: 'English',
    dir: 'ltr',
  },
  ar: {
    locale: 'ar',
    label: 'العربية',
    dir: 'rtl',
  },
};

export const MESSAGE_CATALOGS: Record<SupportedLocale, Record<string, string>> = {
  en: enMessages as unknown as Record<string, string>,
  ar: arMessages as unknown as Record<string, string>,
};

const STORAGE_KEY = 'atlas-locale';

export function resolveInitialLocale(): SupportedLocale {
  const stored = getPersistedLocale();
  if (stored === 'en' || stored === 'ar') return stored;
  const languages = navigator.languages || [navigator.language];
  for (const lang of languages) {
    const primary = lang.split('-')[0];
    if (primary === 'ar') return 'ar';
  }
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The in-memory locale remains usable when browser storage is unavailable.
  }
}

export function removePersistedLocale(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is optional; callers still reset their in-memory locale.
  }
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

function getPersistedLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
