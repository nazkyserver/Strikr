import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Modal({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep going',
  danger = false,
  onConfirm,
  onCancel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onCancel} aria-label="Close">
          <X size={18} weight="bold" />
        </button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id="modal-title">{title}</h2>
        <p className="modal-description">{description}</p>
        <div className="modal-actions">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onCancel}
            autoFocus={danger}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            type="button"
            onClick={onConfirm}
            autoFocus={!danger}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
