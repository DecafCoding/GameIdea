/**
 * Card test page (milestone M1): a button for each deck (the Modifier deck as its 3
 * Modifier decks), a "Combine" button that stands in for
 * the drop, and the drawn cards in a plain grid. No canvas, no storage. It lets the user
 * judge random cards and adjective-and-noun pairs before the rest of the app is built.
 * It has no board, so a genre-tagged deck draws with every genre on.
 */
import { useRef, useState } from 'react';
import {
  CardView,
  combine,
  iconFor,
  isCombined,
  TypeDisc,
  turnCard,
  useRingKeys,
} from '@/features/card';
import { drawCard } from '@/features/draw';
import {
  DECK_NAME,
  DECKS,
  GENRES,
  MOD_DECK_NAME,
  MOD_DECKS,
  type Card,
  type Deck,
  type ModDeck,
} from '@/shared/model';
import { usePools } from '@/shared/pools';
import { Banner, Button } from '@/shared/ui';
import styles from './CardTestPage.module.css';

const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. Drawing is off until the decks load.';

/** The newest uncombined Player Role or Setting, and the newest Modifier. */
function combinePair(cards: Card[]): { target: Card; source: Card } | null {
  const target = cards.find((c) => (c.type === 'role' || c.type === 'setting') && !isCombined(c));
  const source = cards.find((c) => c.type === 'modifier');
  return target && source ? { target, source } : null;
}

/** One draw button: a deck, and for a Modifier its Modifier deck. */
interface DrawButton {
  type: Deck;
  modDeck?: ModDeck;
  label: string;
}

/** Every deck in rail order; the Modifier deck as its 3 Modifier decks. */
const DRAW_BUTTONS: DrawButton[] = DECKS.flatMap((type): DrawButton[] =>
  type === 'modifier'
    ? MOD_DECKS.map((modDeck) => ({ type, modDeck, label: MOD_DECK_NAME[modDeck] }))
    : [{ type, label: DECK_NAME[type] }],
);

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

  function draw(type: Deck, modDeck: ModDeck = 'role') {
    if (!pools) return;
    // Every genre on; the genres filter applies only to genre-tagged decks.
    const card = drawCard(type, pools[type], { genres: GENRES, modDeck });
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
        Draw cards, turn their rings, and combine a Modifier with a Player Role or Setting.
      </p>
      {status === 'failed' && (
        <div className={styles.banner}>
          <Banner kind="warning" text={POOLS_FAILED_TEXT} actionLabel="Retry" onAction={retry} />
        </div>
      )}
      <div className={styles.toolbar}>
        {DRAW_BUTTONS.map(({ type, modDeck, label }) => (
          <button
            key={label}
            type="button"
            className={styles.deck}
            disabled={!ready}
            onClick={() => draw(type, modDeck)}
          >
            <TypeDisc type={type} size={36} icon={iconFor({ type, modDeck })} />
            {`Draw A ${label}`}
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
