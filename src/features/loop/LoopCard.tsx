/**
 * LoopCard: the Core Loop card face (design 9.16, docs/feature-core-loop-card.html). A
 * header with the repeat icon and "Core Loop", the live template (each step's cue text in
 * its deck's lane color, lead words and arrows in the card text color), a divider and the
 * edit field. The field shows the stored loopText, else the live text. While focused it
 * holds a local draft that commits once on blur (Esc blurs), as the note fields do; it
 * grows with its text. The template is read-only and acts as a drag handle; only the field
 * takes text. No React Flow here: the canvas passes its no-drag class names through
 * interactiveClassName, and passes the parts and texts in.
 */
import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/shared/ui';
import { LOOP_ARROW, type LoopPart } from './buildLoopText';
import styles from './LoopCard.module.css';

/** The template's help text with no steps (design 9.16). */
export const LOOP_EMPTY_TEXT = 'Deal or draw cards to build the loop.';

interface LoopCardProps {
  parts: LoopPart[];
  /** The live text: buildLoopText(...).text. */
  liveText: string;
  /** The stored text, if the user has edited the field. */
  loopText?: string;
  /** Called once on blur with the field's text. */
  onCommit: (text: string) => void;
  /** Extra class names for the edit field. */
  interactiveClassName?: string;
}

export function LoopCard({
  parts,
  liveText,
  loopText,
  onCommit,
  interactiveClassName = '',
}: LoopCardProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const value = draft ?? loopText ?? liveText;

  // The field grows with its text (CSS field-sizing is not in every target engine).
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
    }
  }

  return (
    <article
      className={styles.loop}
      aria-label="Core Loop"
      data-testid="loop-card"
      data-loop-card=""
    >
      <header className={styles.header}>
        <span className={styles.dot}>
          <Icon name="repeat" size={13} />
        </span>
        <span className={styles.label}>Core Loop</span>
      </header>
      <p
        className={`${styles.template} ${parts.length === 0 ? styles.empty : ''}`}
        data-testid="loop-template"
      >
        {parts.length === 0
          ? LOOP_EMPTY_TEXT
          : parts.map((part, i) => (
              <Fragment key={part.deck}>
                {i > 0 && LOOP_ARROW}
                {part.lead && `${part.lead} `}
                <span
                  className={styles.step}
                  data-loop-step={part.deck}
                  style={{ color: `var(--rail-${part.deck})` }}
                >
                  {part.text}
                </span>
              </Fragment>
            ))}
      </p>
      <hr className={styles.divider} />
      <textarea
        ref={field}
        className={`${styles.field} ${interactiveClassName}`}
        aria-label="Core Loop Text"
        rows={1}
        value={value}
        onFocus={() => setDraft(loopText ?? liveText)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          const text = draft ?? value;
          setDraft(null);
          onCommit(text);
        }}
      />
    </article>
  );
}
