import { type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import EmptyState from './EmptyState.js';
import { CircleCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';


export function LoadingState({ message }: { message?: string }) {
  const intl = useIntl();
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span>{message ?? intl.formatMessage({ id: 'common.loading' })}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const intl = useIntl();
  return (
    <div className="page-state page-state-error">
      <EmptyState
        icon={TriangleAlert}
        title={intl.formatMessage({ id: 'state.somethingWrong' })}
        message={message || intl.formatMessage({ id: 'state.unexpectedError' })}
        action={
          onRetry ? (
            <button className="button button-secondary" type="button" onClick={onRetry}>
              <CircleCheck size={14} />
              {intl.formatMessage({ id: 'common.retry' })}
            </button>
          ) : null
        }
      />
    </div>
  );
}

export function PermissionDeniedState() {
  const intl = useIntl();
  return (
    <div className="page-state">
      <EmptyState
        icon={ShieldCheck}
        title={intl.formatMessage({ id: 'state.accessDenied' })}
        message={intl.formatMessage({ id: 'state.accessDeniedMessage' })}
      />
    </div>
  );
}

export function NotFoundState({ message }: { message?: string }) {
  const intl = useIntl();
  return (
    <div className="page-state">
      <EmptyState
        icon={TriangleAlert}
        title={intl.formatMessage({ id: 'state.notFound' })}
        message={message || intl.formatMessage({ id: 'state.notFoundMessage' })}
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