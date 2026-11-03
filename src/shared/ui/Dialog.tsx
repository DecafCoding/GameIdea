/**
 * Dialog: the modal dialog shell (design 9.8, delete dialog) on a native <dialog>, so the
 * browser traps focus, closes on Esc through the cancel event and returns focus on close.
 * The parent owns open; Esc calls onClose and the parent sets open to false.
 * A child marked data-autofocus gets focus at open.
 * size: wide is the New Board dialog (design 9.8); panel is the Genres panel (design 9.10),
 * a wide dialog whose body scrolls between a fixed header and footer; default is the delete
 * dialog. showClose adds a × button beside the title; footerNote sits at the left of the
 * actions row.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';
import { Icon } from './Icon';

const SIZE_CLASS = {
  default: styles.dialog,
  wide: `${styles.dialog} ${styles.wide}`,
  panel: `${styles.dialog} ${styles.panel}`,
};

interface DialogProps {
  open: boolean;
  /** The dialog title, also its accessible name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The buttons, right aligned under the body. */
  actions: ReactNode;
  size?: 'default' | 'wide' | 'panel';
  /** A line of muted text right under the title. */
  caption?: string;
  /** A 44 px × button beside the title that calls onClose. */
  showClose?: boolean;
  /** Muted text at the left of the actions row. */
  footerNote?: ReactNode;
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  size = 'default',
  caption,
  showClose = false,
  footerNote,
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
      className={SIZE_CLASS[size]}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // The parent closes it, so open stays the one source of truth.
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <>
          <div className={styles.header}>
            <div className={styles.headerRow}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {showClose && (
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
            {caption && <p className={styles.caption}>{caption}</p>}
          </div>
          <div className={styles.body}>{children}</div>
          <div className={styles.actions}>
            {footerNote && <p className={styles.footerNote}>{footerNote}</p>}
            {actions}
          </div>
        </>
      )}
    </dialog>
  );
}
