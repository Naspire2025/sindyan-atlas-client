import { type ReactNode } from 'react';
import Icon from './Icon.js';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ icon = 'projects', title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={18} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
