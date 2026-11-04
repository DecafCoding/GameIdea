/**
 * TypeDisc: the round type-color disc with the white type glyph. It never turns.
 * Also holds the type icon map used across the card, and iconFor, which picks a Modifier
 * card's icon by its Modifier deck.
 */
import type { Card, CardType, ModDeck } from '@/shared/model';
import { Icon, type IconName } from '@/shared/ui';
import styles from './TypeDisc.module.css';

export const TYPE_ICON: Record<CardType, IconName> = {
  hook: 'hook',
  role: 'user',
  mechanic: 'wrench',
  resource: 'battery',
  goal: 'flag',
  conflict: 'zap',
  modifier: 'user-plus',
  setting: 'map-pin',
  mood: 'smile',
  twist: 'rotate-ccw',
  progression: 'trending-up',
  constraint: 'shield-x',
};

/** The icon of each Modifier deck (design 4.4). */
export const MOD_ICON: Record<ModDeck, IconName> = {
  role: 'user-plus',
  resource: 'battery-plus',
  setting: 'map-pin-plus',
};

/** A card's icon: a Modifier shows its Modifier deck's icon; every other card its type's. */
export function iconFor(card: Pick<Card, 'type' | 'modDeck'>): IconName {
  if (card.type === 'modifier') return MOD_ICON[card.modDeck ?? 'role'];
  return TYPE_ICON[card.type];
}

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
