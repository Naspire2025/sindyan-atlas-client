import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="page-state page-state-error">
      <EmptyState
        icon="alert"
        title="Something went wrong"
        message={message || 'An unexpected error occurred. Please try again.'}
        action={
          onRetry ? (
            <button className="button button-secondary" type="button" onClick={onRetry}>
              <Icon name="check" size={14} />
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
        icon="shield"
        title="Access denied"
        message="You don't have permission to view this page. Contact your administrator if you believe this is an error."
      />
    </div>
  );
}

export function NotFoundState({ message = "The page you're looking for doesn't exist or has been removed." }) {
  return (
    <div className="page-state">
      <EmptyState
        icon="alert"
        title="Not found"
        message={message}
      />
    </div>
  );
}

export function PageState({ isLoading, error, isEmpty, emptyIcon, emptyTitle, emptyMessage, emptyAction, onRetry, children }) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  return children;
}
