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

export default function ConfirmDialog({ title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isPending, onConfirm, onCancel, variant = 'default' }: ConfirmDialogProps) {
  const className = variant === 'danger' ? 'button button-primary button-danger' : 'button button-primary';

  return (
    <DialogShell title={title} description={description} onClose={onCancel}>
      <div className="dialog-body">
        <p className="confirm-message">{description}</p>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </button>
          <button className={className} type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Processing…' : confirmLabel}
          </button>
        </footer>
      </div>
    </DialogShell>
  );
}
