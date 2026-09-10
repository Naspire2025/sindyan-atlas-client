import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import type { SupportedLocale } from './locale.js';
import { LOCALE_METADATA, MESSAGE_CATALOGS, DEFAULT_LOCALE, resolveInitialLocale, persistLocale, SUPPORTED_LOCALES } from './locale.js';
import { LocaleContext } from './locale-context.js';

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(resolveInitialLocale);

  const setLocale = useCallback((next: SupportedLocale) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    persistLocale(next);
  }, []);

  useEffect(() => {
    const metadata = LOCALE_METADATA[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = metadata.dir;
    document.title = MESSAGE_CATALOGS[locale]['title.base'];
  }, [locale]);

  const metadata = LOCALE_METADATA[locale];

  const value = useMemo(() => ({ locale, metadata, setLocale }), [locale, metadata, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider locale={locale} messages={MESSAGE_CATALOGS[locale]} defaultLocale={DEFAULT_LOCALE}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
