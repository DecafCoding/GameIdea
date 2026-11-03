/**
 * SaveMark: the top bar save state (design 9.10): an 8 px dot and a 13 px label that reads
 * Saved, Saving or Save Failed. aria-live, so screen readers hear a failed save.
 */
import { useSaveStatus, type SaveStatus } from '@/shared/store';
import styles from './SaveMark.module.css';

const LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving',
  failed: 'Save Failed',
};

export function SaveMark() {
  const status = useSaveStatus((state) => state.status);
  return (
    <span
      className={`${styles.mark} ${styles[status]}`}
      role="status"
      aria-live="polite"
      data-testid="save-mark"
      data-state={status}
    >
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
