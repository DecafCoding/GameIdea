/**
 * CopyFallbackDialog: shown when the browser blocks Copy (design 9.5). The hook sentence
 * sits in a read-only field, selected on open, so Ctrl+C copies it. The title and field
 * label are Title Case (CLAUDE.md UI Conventions); the body is as the design writes it.
 */
import { useEffect, useRef } from 'react';
import { Button, Dialog } from '@/shared/ui';
import styles from './CopyFallbackDialog.module.css';

export const COPY_BLOCKED_TEXT =
  'The browser blocked the copy. The text is selected. Press Ctrl+C.';

interface CopyFallbackDialogProps {
  open: boolean;
  text: string;
  onClose: () => void;
}

export function CopyFallbackDialog({ open, text, onClose }: CopyFallbackDialogProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  // The Dialog's own effect (showModal and focus) runs first, so the text can be selected.
  useEffect(() => {
    if (open) field.current?.select();
  }, [open]);

  return (
    <Dialog
      open={open}
      title="Copy The Hook"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className={styles.body}>{COPY_BLOCKED_TEXT}</p>
      <label className={styles.label}>
        Hook Sentence
        <textarea
          ref={field}
          className={styles.field}
          readOnly
          rows={4}
          value={text}
          data-autofocus
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
    </Dialog>
  );
}
