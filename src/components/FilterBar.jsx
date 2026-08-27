import Icon from './Icon.jsx';

export default function FilterBar({ children }) {
  return <div className="toolbar-fields">{children}</div>;
}

export function SearchField({ value, onChange, placeholder = 'Search…' }) {
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

export function SelectField({ value, onChange, label, options, placeholder }) {
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
