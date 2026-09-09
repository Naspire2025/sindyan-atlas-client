import { useIntl } from 'react-intl';
import DialogShell from './DialogShell.js';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

export default function ConfirmDialog({ title, description, confirmLabel, cancelLabel, isPending, onConfirm, onCancel, variant = 'default' }: ConfirmDialogProps) {
  const intl = useIntl();
  const className = variant === 'danger' ? 'button button-primary button-danger' : 'button button-primary';
  const resolvedConfirmLabel = confirmLabel ?? intl.formatMessage({ id: 'common.confirm' });
  const resolvedCancelLabel = cancelLabel ?? intl.formatMessage({ id: 'common.cancel' });

  return (
    <DialogShell title={title} description={description} onClose={onCancel}>
      <div className="dialog-body">
        <p className="confirm-message">{description}</p>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={isPending}>
            {resolvedCancelLabel}
          </button>
          <button className={className} type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? intl.formatMessage({ id: 'common.processing' }) : resolvedConfirmLabel}
          </button>
        </footer>
      </div>
    </DialogShell>
  );
}