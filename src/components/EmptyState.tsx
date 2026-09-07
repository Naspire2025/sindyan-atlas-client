import { type ReactNode } from 'react';
import { Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon = Layers, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon size={18} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
