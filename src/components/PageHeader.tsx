import { type ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  onMenu: () => void;
}

export default function PageHeader({ eyebrow, title, description, action, onMenu }: PageHeaderProps) {
  return (
    <header className="page-header">
      <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={18} />
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
