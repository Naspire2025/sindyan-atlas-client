import { type ReactNode } from 'react';

interface DetailListProps {
  children: ReactNode;
}

/** Renders the shared detail-list list wrapper used across lists of items. */
export function DetailList({ children }: DetailListProps) {
  return <div className="detail-list">{children}</div>;
}

interface DetailRowProps {
  children: ReactNode;
  className?: string;
}

/** Renders a single shared detail-list-row item wrapper, with optional extra classes. */
export function DetailRow({ children, className }: DetailRowProps) {
  return <div className={`detail-list-row${className ? ` ${className}` : ''}`}>{children}</div>;
}