/**
 * LoopCard: the Core Loop card face (design 9.16, docs/feature-core-loop-card.html). A
 * header with the repeat icon and "Core Loop", then the edit field (the read-only live
 * template above it was removed, user 2026-11-05). The field shows the stored loopText,
 * else the live text; with neither, the help text shows as its placeholder. While focused
 * it holds a local draft that commits once on blur (Esc blurs), as the note fields do; it
 * is as tall as its text at the current width. The header and padding are the drag handle. No React Flow here: the
 * canvas passes its no-drag class names through interactiveClassName, and the texts in.
 */
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PanelTitle } from '@/shared/ui';
import styles from './LoopCard.module.css';

/** The field's placeholder with no steps and no edit (design 9.16, user 2026-11-05). */
export const LOOP_EMPTY_TEXT = 'Add cards to the Hook';

interface LoopCardProps {
  /** The live text: buildLoopText(...).text. */
  liveText: string;
  /** The stored text, if the user has edited the field. */
  loopText?: string;
  /** Called once on blur with the field's text. */
  onCommit: (text: string) => void;
  /** Extra class names for the edit field. */
  interactiveClassName?: string;
  /** The card's drawn width; a change refits the field's height to its text. */
  width?: number;
}

export function LoopCard({
  liveText,
  loopText,
  onCommit,
  interactiveClassName = '',
  width,
}: LoopCardProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const value = draft ?? loopText ?? liveText;

  // The field is as tall as its text (CSS field-sizing is not in every target engine): it
  // fits again when the text changes and when the card's width changes, as on a resize.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, width]);

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
      <PanelTitle icon="repeat" title="Core Loop" />
      <textarea
        ref={field}
        className={`${styles.field} ${interactiveClassName}`}
        aria-label="Core Loop Text"
        placeholder={LOOP_EMPTY_TEXT}
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
