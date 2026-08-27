import DialogShell from './DialogShell.jsx';

export default function ConfirmDialog({ title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', isPending, onConfirm, onCancel, variant = 'default' }) {
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
