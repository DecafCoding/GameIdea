/**
 * GenreDialog: the 2-step New Board dialog (design 9.8, frame 12). Step 1 sets the board
 * name and the board genres (4 toggle tiles, Sci-Fi nesting, at least 1). Step 2 shows 1 chip
 * row per deck, so each deck can draw from fewer genres (each row keeps at least 1 chip on).
 * Back keeps every choice. Create Board passes the name and deck genres; Cancel and Esc
 * create nothing. The parent mounts it only while choosing, so it resets on every open.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { TypeDisc } from '@/features/card';
import { CARD_TYPES, GENRES, type CardType, type DeckGenres, type Genre } from '@/shared/model';
import { NEW_BOARD_NAME } from '@/shared/store';
import { Button, Dialog, Icon } from '@/shared/ui';
import {
  boardName,
  canGoNext,
  chooseGenre,
  deckChips,
  deckGenres,
  initialChoice,
  toggleChip,
} from './genreChoice';
import styles from './GenreDialog.module.css';

interface GenreDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the resolved board name and 1 genre list per deck. */
  onCreate: (name: string, genres: DeckGenres) => void;
}

export const STEP1_CAPTION = 'Pick the genres for this board.';
export const STEP2_CAPTION =
  'Each deck draws from the genres that are on. Turn a genre off to keep it out of that deck.';
export const GENRE_HINT_TEXT = 'Pick at least 1 genre.';
export const FOOTER_NOTE = 'All decks use every genre you pick, unless you change that in step 2.';

export const GENRE_LABEL: Record<Genre, string> = {
  generic: 'Generic',
  'sci-fi': 'Sci-Fi',
  cyberpunk: 'Cyberpunk',
  'space-opera': 'Space Opera',
};

const DECK_NAME: Record<CardType, string> = {
  character: 'Character',
  motivation: 'Motivation',
  setting: 'Setting',
  conflict: 'Conflict',
  description: 'Description',
};

export function GenreDialog({ open, onCancel, onCreate }: GenreDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState(NEW_BOARD_NAME);
  const [choice, setChoice] = useState(initialChoice);
  const [enter, setEnter] = useState<'next' | 'back' | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const firstChip = useRef<HTMLButtonElement>(null);
  const selected = useRef(false);
  const firstRender = useRef(true);
  const nameId = useId();
  const genresId = useId();
  const ready = canGoNext(choice);

  // After a step change, focus the first control of the new step. Dialog focuses the name
  // field at open (data-autofocus).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step === 2) firstChip.current?.focus();
    else nameField.current?.focus();
  }, [step]);

  function goTo(next: 1 | 2) {
    setEnter(next === 2 ? 'next' : 'back');
    setStep(next);
  }

  function clickChip(deck: CardType, genre: Genre) {
    const next = toggleChip(choice, deck, genre);
    if (next) setChoice(next);
    else setShaking(`${deck}:${genre}`);
  }

  const actions =
    step === 1 ? (
      <>
        <p className={styles.footerNote}>{FOOTER_NOTE}</p>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!ready} onClick={() => goTo(2)}>
          Next
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          className={`${styles.withIcon} ${styles.backButton}`}
          onClick={() => goTo(1)}
        >
          <Icon name="chevron-down" size={16} className={styles.back} />
          Back
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onCreate(boardName(draft), deckGenres(choice))}>
          Create Board
        </Button>
      </>
    );

  return (
    <Dialog
      open={open}
      size="wide"
      title={step === 1 ? 'New Board' : `Decks For "${boardName(draft)}"`}
      caption={step === 1 ? STEP1_CAPTION : STEP2_CAPTION}
      onClose={onCancel}
      actions={actions}
    >
      <div className={styles.clip}>
        <div className={styles.step} data-enter={enter ?? undefined} key={step}>
          {step === 1 ? (
            <>
              <label htmlFor={nameId} className={styles.label}>
                Board Name
              </label>
              <input
                id={nameId}
                ref={nameField}
                type="text"
                className={styles.name}
                value={draft}
                data-autofocus
                onFocus={(event) => {
                  // Select "Untitled Board" on the first focus at open, so typing replaces it.
                  if (selected.current) return;
                  selected.current = true;
                  event.currentTarget.select();
                }}
                onChange={(event) => setDraft(event.target.value)}
              />
              <p id={genresId} className={styles.label}>
                Genres
              </p>
              <div role="group" aria-labelledby={genresId} className={styles.tiles}>
                {GENRES.map((genre) => {
                  const on = choice.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      aria-pressed={on}
                      className={styles.tile}
                      onClick={() => setChoice(chooseGenre(choice, genre, !on))}
                    >
                      {GENRE_LABEL[genre]}
                      {on && <Icon name="check" size={18} className={styles.check} />}
                    </button>
                  );
                })}
              </div>
              {!ready && <p className={styles.hint}>{GENRE_HINT_TEXT}</p>}
            </>
          ) : (
            <div className={styles.rows}>
              {CARD_TYPES.map((deck) => (
                <div key={deck} role="group" aria-label={DECK_NAME[deck]} className={styles.row}>
                  <TypeDisc type={deck} size={28} />
                  <span className={styles.deckName}>{DECK_NAME[deck]}</span>
                  <div className={styles.chips}>
                    {deckChips(choice, deck).map(({ genre, on }, i) => {
                      const key = `${deck}:${genre}`;
                      return (
                        <button
                          key={genre}
                          ref={deck === CARD_TYPES[0] && i === 0 ? firstChip : undefined}
                          type="button"
                          aria-pressed={on}
                          className={
                            shaking === key ? `${styles.chip} ${styles.shake}` : styles.chip
                          }
                          onClick={() => clickChip(deck, genre)}
                          onAnimationEnd={() => setShaking(null)}
                        >
                          <span className={styles.pill}>{GENRE_LABEL[genre]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
