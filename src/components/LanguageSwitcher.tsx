import { useState, type ChangeEvent } from 'react';
import { Globe2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { LOCALE_METADATA, SUPPORTED_LOCALES, type SupportedLocale } from '../i18n/locale.js';
import { useLocale } from '../i18n/useLocale.js';

export function LanguageSwitcher() {
  const intl = useIntl();
  const { status } = useAuth();
  const { locale, setLocale } = useLocale();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as SupportedLocale;
    const previousLocale = locale;
    setError('');
    setLocale(nextLocale);

    if (status !== 'authenticated') return;

    setIsSaving(true);
    try {
      await api.updatePreferences({ locale: nextLocale });
    } catch {
      setLocale(previousLocale);
      setError(intl.formatMessage({ id: 'language.saveError' }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      <label className="inline-flex items-center gap-2 rounded-control border border-graphite bg-carbon px-2.5 py-1.5 text-xs text-fog focus-within:border-mist">
        <Globe2 aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">{intl.formatMessage({ id: 'language.label' })}</span>
        <select
          aria-label={intl.formatMessage({ id: 'language.label' })}
          className="cursor-pointer border-0 bg-transparent p-0 text-xs font-[510] text-mist outline-none disabled:cursor-wait disabled:opacity-60"
          disabled={isSaving}
          value={locale}
          onChange={handleChange}
        >
          {SUPPORTED_LOCALES.map((supportedLocale) => (
            <option key={supportedLocale} value={supportedLocale}>
              {LOCALE_METADATA[supportedLocale].label}
            </option>
          ))}
        </select>
      </label>
      {error && <span className="max-w-52 text-end text-[10px] text-coral-red" role="alert">{error}</span>}
    </div>
  );
}
