/**
 * Card test page (milestone M1): 5 deck buttons, a "Combine" button that stands in for
 * the drop, and the drawn cards in a plain grid. No canvas, no storage. It lets the user
 * judge random cards and adjective-and-noun pairs before the rest of the app is built.
 * It has no board, so it draws from all 4 genres.
 */
import { useRef, useState } from 'react';
import { CardView, combine, isCombined, TypeDisc, turnCard, useRingKeys } from '@/features/card';
import { drawCard } from '@/features/draw';
import { CARD_TYPES, GENRES, type Card, type CardType } from '@/shared/model';
import { usePools } from '@/shared/pools';
import { Banner, Button } from '@/shared/ui';
import styles from './CardTestPage.module.css';

const DECK_LABEL: Record<CardType, string> = {
  character: 'Draw A Character',
  motivation: 'Draw A Motivation',
  setting: 'Draw A Setting',
  conflict: 'Draw A Conflict',
  description: 'Draw A Description',
};

const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. Drawing is off until the decks load.';

/** The newest uncombined Character or Setting, and the newest Description. */
function combinePair(cards: Card[]): { target: Card; source: Card } | null {
  const target = cards.find(
    (c) => (c.type === 'character' || c.type === 'setting') && !isCombined(c),
  );
  const source = cards.find((c) => c.type === 'description');
  return target && source ? { target, source } : null;
}

export function CardTestPage() {
  const { status, pools, retry } = usePools();
  // Newest first.
  const [cards, setCards] = useState<Card[]>([]);
  // The R key target: the card under the pointer, else the focused card. Refs, not state,
  // so a key pressed right after the pointer arrives already sees the new target.
  const hoverId = useRef<string | null>(null);
  const focusId = useRef<string | null>(null);

  const ready = status === 'ready' && pools !== null;
  const pair = combinePair(cards);

  function update(id: string, change: (card: Card) => Card) {
    setCards((list) => list.map((c) => (c.id === id ? change(c) : c)));
  }

  function draw(type: CardType) {
    if (!pools) return;
    const card = drawCard(type, pools[type], GENRES);
    setCards((list) => [card, ...list]);
  }

  function combinePairNow() {
    if (!pair) return;
    const combined = combine(pair.target, pair.source);
    setCards((list) =>
      list.filter((c) => c.id !== pair.source.id).map((c) => (c.id === combined.id ? combined : c)),
    );
  }

  useRingKeys(
    () => hoverId.current ?? focusId.current,
    (id, slot) => update(id, (c) => turnCard(c, slot, 'cw')),
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Card Test</h1>
      <p className={styles.caption}>
        Draw cards, turn their rings, and combine a Description with a Character or Setting.
      </p>
      {status === 'failed' && (
        <div className={styles.banner}>
          <Banner kind="warning" text={POOLS_FAILED_TEXT} actionLabel="Retry" onAction={retry} />
        </div>
      )}
      <div className={styles.toolbar}>
        {CARD_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={styles.deck}
            disabled={!ready}
            onClick={() => draw(type)}
          >
            <TypeDisc type={type} size={36} />
            {DECK_LABEL[type]}
          </button>
        ))}
        <Button variant="secondary" disabled={!pair} onClick={combinePairNow}>
          Combine
        </Button>
      </div>
      <div className={styles.grid}>
        {cards.map((card) => (
          <div
            key={card.id}
            onPointerEnter={() => (hoverId.current = card.id)}
            onPointerLeave={() => {
              if (hoverId.current === card.id) hoverId.current = null;
            }}
            onFocus={() => (focusId.current = card.id)}
            onBlur={() => {
              if (focusId.current === card.id) focusId.current = null;
            }}
          >
            <CardView
              card={card}
              onTurn={(slot, direction) => update(card.id, (c) => turnCard(c, slot, direction))}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
