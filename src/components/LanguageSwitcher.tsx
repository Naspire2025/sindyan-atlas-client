import { useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLocale } from '../i18n/useLocale.js';
import { SUPPORTED_LOCALES, LOCALE_METADATA } from '../i18n/locale.js';
import type { SupportedLocale } from '../i18n/locale.js';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleSelect(next: SupportedLocale) {
    setLocale(next);
    setIsOpen(false);
  }

  const currentLabel = LOCALE_METADATA[locale]?.label ?? locale;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
        aria-label={intl.formatMessage({ id: 'language.label' })}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>{currentLabel}</span>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          aria-label={intl.formatMessage({ id: 'language.label' })}
          className="absolute right-0 z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-900"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const meta = LOCALE_METADATA[code];
            const isActive = code === locale;
            return (
              <li
                key={code}
                role="option"
                aria-selected={isActive}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                onClick={() => handleSelect(code)}
              >
                <span className={`flex-1 ${isActive ? 'font-semibold text-emerald-500' : ''}`}>
                  {meta.label}
                </span>
                {isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-500">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
