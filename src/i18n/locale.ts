import { enMessages } from './messages/en.js';
import { arMessages } from './messages/ar.js';

export type SupportedLocale = 'en' | 'ar';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'ar'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export type LocaleMetadata = {
  locale: SupportedLocale;
  label: string;
  dir: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  headerDirection: string;
};

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  en: {
    locale: 'en',
    label: 'English',
    dir: 'ltr',
    dateFormat: 'en-u-ca-gregory-nu-latn',
    numberFormat: { locale: 'en', options: {} },
    headerDirection: 'ltr',
  },
  ar: {
    locale: 'ar',
    label: 'العربية',
    dir: 'rtl',
    dateFormat: 'ar-u-ca-gregory-nu-arab',
    numberFormat: { locale: 'ar', options: {} },
    headerDirection: 'rtl',
  },
};

export const MESSAGE_CATALOGS: Record<SupportedLocale, Record<string, string>> = {
  en: enMessages as unknown as Record<string, string>,
  ar: arMessages as unknown as Record<string, string>,
};

const STORAGE_KEY = 'atlas-locale';

export function resolveInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  const languages = navigator.languages || [navigator.language];
  for (const lang of languages) {
    const primary = lang.split('-')[0];
    if (primary === 'ar') return 'ar';
  }
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: SupportedLocale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function removePersistedLocale(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

let localeSetter: ((locale: SupportedLocale) => void) | null = null;

export function registerLocaleSetter(setter: (locale: SupportedLocale) => void): void {
  localeSetter = setter;
}

export function unregisterLocaleSetter(): void {
  localeSetter = null;
}

export function applyLocaleFromPreference(preferredLocale: SupportedLocale): void {
  try {
    if (localeSetter && preferredLocale !== resolveInitialLocale()) {
      localeSetter(preferredLocale);
    }
  } catch {
    // storage or provider unavailable; fall back to the in-memory locale
  }
}
