import { useIntl } from 'react-intl';
import type { ReactNode, ChangeEvent } from 'react';
import { Search } from 'lucide-react';

import type { Option } from '../constants.js';

interface FilterBarProps {
  children: ReactNode;
}

export default function FilterBar({ children }: FilterBarProps) {
  return <div className="toolbar-fields">{children}</div>;
}

interface SearchFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  placeholderMessageId?: string;
}

export function SearchField({ value, onChange, placeholder, placeholderMessageId = 'common.search' }: SearchFieldProps) {
  const intl = useIntl();
  const resolvedPlaceholder = placeholder ?? intl.formatMessage({ id: placeholderMessageId });
  return (
    <label className="search-field">
      <Search />
      <span className="sr-only">{resolvedPlaceholder}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={resolvedPlaceholder}
      />
    </label>
  );
}

interface SelectFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  label: string;
  options: Option[];
  placeholder?: string;
}

export function SelectField({ value, onChange, label, options, placeholder }: SelectFieldProps) {
  const intl = useIntl();
  return (
    <label className="select-field">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={onChange}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {intl.formatMessage({ id: option.label })}
          </option>
        ))}
      </select>
    </label>
  );
}