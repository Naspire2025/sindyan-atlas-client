import Icon from './Icon.jsx';

export default function PageHeader({ eyebrow, title, description, action, onMenu }) {
  return (
    <header className="page-header">
      <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}>
        <Icon name="menu" size={18} />
      </button>
      <div className="page-heading">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
