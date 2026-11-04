/**
 * CardStrip: a card's strip menu (design 9.4): 44 px icon buttons with tooltips, Split
 * (combined cards, or a card with an On Top Modifier), Redraw, Duplicate, Lock / Unlock
 * (an open lock while unlocked, a closed lock and pressed while locked) and Discard.
 * The canvas shows it on hover, 4 px above the card.
 */
import { Icon, type IconName } from '@/shared/ui';
import styles from './CardStrip.module.css';

interface CardStripProps {
  /** Shows Split: the card has a merged ring or an On Top Modifier. */
  canSplit: boolean;
  locked: boolean;
  redrawDisabled?: boolean;
  onSplit: () => void;
  onRedraw: () => void;
  onDuplicate: () => void;
  onLock: () => void;
  onDiscard: () => void;
}

interface StripButtonProps {
  label: string;
  icon: IconName;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
}

function StripButton({ label, icon, className, disabled, pressed, onClick }: StripButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function CardStrip({
  canSplit,
  locked,
  redrawDisabled = false,
  onSplit,
  onRedraw,
  onDuplicate,
  onLock,
  onDiscard,
}: CardStripProps) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Card Actions" data-testid="card-strip">
      {canSplit && (
        <StripButton label="Split" icon="split" className={styles.split} onClick={onSplit} />
      )}
      <StripButton
        label="Redraw"
        icon="playing-cards-fan"
        disabled={redrawDisabled}
        onClick={onRedraw}
      />
      <StripButton label="Duplicate" icon="copy" onClick={onDuplicate} />
      <StripButton
        label={locked ? 'Unlock' : 'Lock'}
        icon={locked ? 'lock' : 'lock-open'}
        className={styles.lock}
        pressed={locked}
        onClick={onLock}
      />
      <StripButton label="Discard" icon="trash" className={styles.discard} onClick={onDiscard} />
    </div>
  );
}
