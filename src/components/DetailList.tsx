import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

type DetailListProps = ComponentPropsWithoutRef<'div'>;

/** Renders the shared detail-list list wrapper used across lists of items. */
export function DetailList({ children, className, ...props }: DetailListProps) {
  return (
    <div
      className={`detail-list${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface DetailRowProps {
  children: ReactNode;
  className?: string;
}

/** Renders a single shared detail-list-row item wrapper, with optional extra classes. */
export function DetailRow({ children, className }: DetailRowProps) {
  return <div className={`detail-list-row${className ? ` ${className}` : ''}`}>{children}</div>;
}
