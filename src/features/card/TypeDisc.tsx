/**
 * TypeDisc: the round type-color disc with the white type glyph. It never turns.
 * Also holds the type icon map used across the card.
 */
import type { CardType } from '@/shared/model';
import { Icon, type IconName } from '@/shared/ui';
import styles from './TypeDisc.module.css';

export const TYPE_ICON: Record<CardType, IconName> = {
  role: 'user',
  goal: 'flag',
  conflict: 'zap',
  // Phase 2 picks the Modifier icon by modDeck; until then the single deck uses user-plus.
  modifier: 'user-plus',
  setting: 'map-pin',
};

interface TypeDiscProps {
  type: CardType;
  /** 48 on the card, 36 on deck buttons, 28 in the New Board deck rows. The glyph is half the disc. */
  size: 48 | 36 | 28;
  /** Replaces the type glyph. */
  icon?: IconName;
}

export function TypeDisc({ type, size, icon }: TypeDiscProps) {
  return (
    <span
      className={styles.disc}
      data-testid="type-disc"
      style={{ width: size, height: size, background: `var(--deck-${type})` }}
    >
      <Icon name={icon ?? TYPE_ICON[type]} size={size / 2} />
    </span>
  );
}
