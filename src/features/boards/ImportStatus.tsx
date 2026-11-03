/**
 * ImportStatus: the short "Board imported." message above the board list (design 9.8),
 * with the check icon. The list shows it for a short time after an import.
 */
import { Icon } from '@/shared/ui';
import styles from './ImportStatus.module.css';

export function ImportStatus({ text }: { text: string }) {
  return (
    <div role="status" className={styles.status}>
      <Icon name="check" size={16} className={styles.check} />
      {text}
    </div>
  );
}
