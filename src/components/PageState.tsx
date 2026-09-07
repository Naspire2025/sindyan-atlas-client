import { type ReactNode } from 'react';
import EmptyState from './EmptyState.js';
import { CircleCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';


export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="page-state page-state-error">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        message={message || 'An unexpected error occurred. Please try again.'}
        action={
          onRetry ? (
            <button className="button button-secondary" type="button" onClick={onRetry}>
              <CircleCheck size={14} />
              Try again
            </button>
          ) : null
        }
      />
    </div>
  );
}

export function PermissionDeniedState() {
  return (
    <div className="page-state">
      <EmptyState
        icon={ShieldCheck}
        title="Access denied"
        message="You don't have permission to view this page. Contact your administrator if you believe this is an error."
      />
    </div>
  );
}

export function NotFoundState({ message = "The page you're looking for doesn't exist or has been removed." }: { message?: string }) {
  return (
    <div className="page-state">
      <EmptyState
        icon={TriangleAlert}
        title="Not found"
        message={message}
      />
    </div>
  );
}

interface PageStateProps {
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
}

export function PageState({ isLoading, error, isEmpty, emptyIcon, emptyTitle, emptyMessage, emptyAction, onRetry, children }: PageStateProps) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle || ''} message={emptyMessage || ''} action={emptyAction} />;
  return <>{children}</>;
}
