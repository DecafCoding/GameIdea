/**
 * ChipView: one Concept chip on a One-Pager board (design 9.15): the card's words only,
 * with no icon, no buttons and no strip menu. A 1 px border in the deck card color and the
 * deck card color at 28% fill. It is as wide as its text, never wider than its lane, and
 * wraps longer text. targeted: the Modifier drop target outline. hidden: kept in the
 * layout but not drawn, while the chip is dragged out. Plain React: no React Flow here.
 */
import type { CSSProperties } from 'react';
import type { Deck } from '@/shared/model';
import styles from './ChipView.module.css';

interface ChipViewProps {
  text: string;
  deck: Deck;
  /** A Modifier is over this chip and would combine with it. */
  targeted?: boolean;
  /** The chip is being dragged out: it keeps its space but is not drawn. */
  hidden?: boolean;
}

export function ChipView({ text, deck, targeted = false, hidden = false }: ChipViewProps) {
  const style = { '--chip-deck': `var(--deck-${deck})` } as CSSProperties;
  return (
    <span
      className={[styles.chip, targeted ? styles.targeted : '', hidden ? styles.hidden : '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      data-type={deck}
      data-targeted={targeted || undefined}
      data-testid="chip"
    >
      {text}
    </span>
  );
}
