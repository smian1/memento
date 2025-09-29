import React from 'react';
import { Trash2 } from 'lucide-react';
import { Portal } from './Portal';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <Portal>
      <div className="confirm-dialog-overlay" onClick={handleBackdropClick}>
        <div className="confirm-dialog">
          <div className="confirm-dialog-header">
            <div className="confirm-dialog-icon">
              <Trash2 size={20} />
            </div>
            <h3 className="confirm-dialog-title">{title}</h3>
            <button
              className="confirm-dialog-close"
              onClick={onCancel}
              aria-label="Close dialog"
            >
              <span className="confirm-dialog-close-icon" aria-hidden="true" />
            </button>
          </div>

          <div className="confirm-dialog-content">
            <p className="confirm-dialog-message">{message}</p>
          </div>

          <div className="confirm-dialog-actions">
            <button
              className="confirm-dialog-button cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              className={`confirm-dialog-button ${confirmVariant}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
