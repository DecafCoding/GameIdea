/**
 * Dialog: the modal dialog shell (design 9.8, delete dialog) on a native <dialog>, so the
 * browser traps focus, closes on Esc through the cancel event and returns focus on close.
 * The parent owns open; Esc calls onClose and the parent sets open to false.
 * A child marked data-autofocus gets focus at open.
 * size: wide is the New Board dialog (design 9.8); default is the delete dialog.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  /** The dialog title, also its accessible name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The buttons, right aligned under the body. */
  actions: ReactNode;
  size?: 'default' | 'wide';
  /** A line of muted text right under the title. */
  caption?: string;
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  size = 'default',
  caption,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before showModal, while the dialog is still closed.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={size === 'wide' ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // The parent closes it, so open stays the one source of truth.
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {caption && <p className={styles.caption}>{caption}</p>}
          <div className={styles.body}>{children}</div>
          <div className={styles.actions}>{actions}</div>
        </>
      )}
    </dialog>
  );
}
