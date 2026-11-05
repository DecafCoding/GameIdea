/**
 * LoopMenu: the Core Loop card's hover menu (design 9.16, on the Hook Card menu spec of
 * 9.5): Copy Loop, then Reset From Cards only while the card has stored text. No Duplicate
 * and no Discard. Copy Loop copies the shown text (the stored text, else the live text)
 * through the hook feature's copyHook, so only features/hook calls the Clipboard API; it is
 * off when that text is empty. After a good copy it shows a check and reads "Copied" for
 * 2 seconds; a blocked copy opens the fallback dialog titled "Copy The Loop". The menu
 * stays mounted while hidden, so "Copied" and the dialog survive the pointer leaving.
 */
import { useEffect, useRef, useState } from 'react';
import { COPIED_MS, CopyFallbackDialog, copyHook, type ClipboardLike } from '@/features/hook';
import { Icon } from '@/shared/ui';
import styles from './LoopMenu.module.css';

interface LoopMenuProps {
  /** The shown text: the stored loopText, else the live text. */
  text: string;
  /** The card has stored text: Reset From Cards shows. */
  hasLoopText: boolean;
  /** The pointer is over the card or the menu. */
  visible: boolean;
  onReset: () => void;
  /** For tests; defaults to the browser clipboard (through copyHook). */
  clipboard?: ClipboardLike;
}

export function LoopMenu({ text, hasLoopText, visible, onReset, clipboard }: LoopMenuProps) {
  const [copied, setCopied] = useState(false);
  // The menu also stays while focus is in it (after a click, or from the keyboard).
  const [focused, setFocused] = useState(false);
  const shown = visible || focused;
  const tabIndex = shown ? undefined : -1;
  const [fallback, setFallback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const result = await (clipboard ? copyHook(text, clipboard) : copyHook(text));
    if (result === 'blocked') {
      setFallback(text);
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  const copyLabel = copied ? 'Copied' : 'Copy Loop';

  return (
    <>
      <div
        className={`${styles.menu} ${shown ? '' : styles.hidden}`}
        role="toolbar"
        aria-label="Core Loop Actions"
        aria-hidden={!shown}
        data-testid="loop-menu"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <button
          type="button"
          className={`${styles.button} ${copied ? styles.copied : ''}`}
          aria-label={copyLabel}
          title={copyLabel}
          disabled={text === ''}
          tabIndex={tabIndex}
          onClick={() => void copy()}
        >
          <Icon name={copied ? 'check' : 'repeat'} size={16} />
        </button>
        {hasLoopText && (
          <button
            type="button"
            className={styles.button}
            aria-label="Reset From Cards"
            title="Reset From Cards"
            tabIndex={tabIndex}
            onClick={onReset}
          >
            <Icon name="square-arrow-down" size={16} />
          </button>
        )}
      </div>
      <CopyFallbackDialog
        open={fallback !== null}
        text={fallback ?? ''}
        title="Copy The Loop"
        label="Core Loop"
        onClose={() => setFallback(null)}
      />
    </>
  );
}
