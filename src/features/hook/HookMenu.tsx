/**
 * HookMenu: the Hook Card's hover menu (design 9.5, on the card strip menu spec of 9.4):
 * Copy, Redraw All and Discard. Copy and Redraw All are off until a card is tucked under
 * the Hook Card; Redraw All is also off while the pools are not ready. After a good copy,
 * Copy reads "Copied" for 2 seconds; a blocked copy opens the fallback dialog.
 * The canvas shows the menu while the pointer is over the Hook Card or the menu. The menu
 * stays mounted while hidden, so the "Copied" state and the dialog survive the pointer
 * leaving.
 */
import { useEffect, useRef, useState } from 'react';
import { copyHook, type ClipboardLike } from './copyHook';
import { CopyFallbackDialog } from './CopyFallbackDialog';
import styles from './HookMenu.module.css';

/** How long Copy reads "Copied" (design 9.5). */
export const COPIED_MS = 2000;

interface HookMenuProps {
  sentence: string;
  /** A card is tucked under the Hook Card. */
  hasStack: boolean;
  poolsReady: boolean;
  /** The pointer is over the Hook Card or the menu. */
  visible: boolean;
  onRedrawAll: () => void;
  onDiscard: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  /** For tests; defaults to navigator.clipboard. */
  clipboard?: ClipboardLike;
}

export function HookMenu({
  sentence,
  hasStack,
  poolsReady,
  visible,
  onRedrawAll,
  onDiscard,
  onPointerEnter,
  onPointerLeave,
  clipboard,
}: HookMenuProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const result = await (clipboard ? copyHook(sentence, clipboard) : copyHook(sentence));
    if (result === 'blocked') {
      setFallback(sentence);
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <>
      <div
        className={`${styles.menu} ${visible ? '' : styles.hidden}`}
        role="toolbar"
        aria-label="Hook Card Actions"
        aria-hidden={!visible}
        data-testid="hook-menu"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <button
          type="button"
          className={`${styles.button} ${copied ? styles.copied : ''}`}
          disabled={!hasStack}
          tabIndex={visible ? undefined : -1}
          onClick={() => void copy()}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!hasStack || !poolsReady}
          tabIndex={visible ? undefined : -1}
          onClick={onRedrawAll}
        >
          Redraw All
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.discard}`}
          tabIndex={visible ? undefined : -1}
          onClick={onDiscard}
        >
          Discard
        </button>
      </div>
      <CopyFallbackDialog
        open={fallback !== null}
        text={fallback ?? ''}
        onClose={() => setFallback(null)}
      />
    </>
  );
}
