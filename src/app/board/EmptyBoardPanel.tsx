/**
 * EmptyBoardPanel: the 440 px panel over an empty board (design 9.11), with a primary
 * "Draw A Player Role" button. The board screen decides when it shows.
 */
import type { CardType } from '@/shared/model';
import { Button } from '@/shared/ui';
import { AppMark } from './TopBar';
import styles from './EmptyBoardPanel.module.css';

interface EmptyBoardPanelProps {
  decksReady: boolean;
  onDraw: (type: CardType, from: DOMRect) => void;
}

export function EmptyBoardPanel({ decksReady, onDraw }: EmptyBoardPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="empty-board-title">
      <AppMark />
      <h2 id="empty-board-title" className={styles.title}>
        Start With One Card
      </h2>
      <p className={styles.text}>
        Click a deck on the left. A card appears here with a few cues. Point at the card and click a
        ring arrow to pick the cue you like.
      </p>
      <p className={styles.text}>
        A good first set is a Player Role, a Goal and a Conflict. Drag a card near another to tuck
        them together.
      </p>
      <Button
        variant="primary"
        disabled={!decksReady}
        onClick={(event) => onDraw('role', event.currentTarget.getBoundingClientRect())}
      >
        Draw A Player Role
      </Button>
    </section>
  );
}
