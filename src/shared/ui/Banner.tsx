/**
 * Banner: the one-line warning or status message with one action (design section 9.10).
 * A warning shows the alert-circle icon unless it names another (the bad-import banner
 * uses file-x). A status banner has no icon.
 */
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import styles from './Banner.module.css';

interface BannerProps {
  kind: 'warning' | 'status';
  /** Sentence-case message from the design doc. */
  text: string;
  /** Title Case action label. */
  actionLabel: string;
  onAction: () => void;
  actionVariant?: 'primary' | 'secondary';
  /** Warning banners only. */
  icon?: IconName;
}

export function Banner({
  kind,
  text,
  actionLabel,
  onAction,
  actionVariant = 'secondary',
  icon = 'alert-circle',
}: BannerProps) {
  return (
    <div
      role={kind === 'warning' ? 'alert' : 'status'}
      className={`${styles.banner} ${styles[kind]}`}
    >
      {kind === 'warning' && <Icon name={icon} size={20} className={styles.icon} />}
      <p className={styles.text}>{text}</p>
      <Button variant={actionVariant} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
