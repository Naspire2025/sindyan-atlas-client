import { type ReactNode, type ChangeEvent } from 'react';
import Icon from './Icon.js';
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
}

export function SearchField({ value, onChange, placeholder = 'Search…' }: SearchFieldProps) {
  return (
    <label className="search-field">
      <Icon name="search" />
      <span className="sr-only">{placeholder}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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
  return (
    <label className="select-field">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={onChange}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
