import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';

interface DialogShellProps {
  children: ReactNode;
  description?: string;
  closeDisabled?: boolean;
  onClose: () => void;
  size?: 'default' | 'large' | 'small';
  title: string;
}

export default function DialogShell({ children, closeDisabled = false, description, onClose, size = 'default', title }: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    (dialog?.querySelector(FOCUSABLE_SELECTOR) as HTMLElement)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose();
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)] as HTMLElement[];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('dialog-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('dialog-open');
      previousFocus?.focus();
    };
  }, [closeDisabled, onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !closeDisabled && onClose()}>
      <section ref={dialogRef} className={`dialog dialog-${size}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined}>
        <header className="dialog-header">
          <div><span className="eyebrow">Atlas</span><h2 id="dialog-title">{title}</h2>{description && <p id="dialog-description">{description}</p>}</div>
          <button className="icon-button" type="button" aria-label="Close dialog" disabled={closeDisabled} onClick={onClose}><X /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
