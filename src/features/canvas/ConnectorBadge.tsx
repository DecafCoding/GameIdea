/**
 * ConnectorBadge: the connector word on the seam between a card and the card tucked under
 * it (design 9.4). A click opens the pair's word list; a click on a word saves it and
 * closes the list. The list is drawn in screen space in a portal, so it keeps its size at
 * any zoom and sits above every stack. Built on the ARIA menu-button pattern, like Export.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/shared/ui';
import type { Connector } from './connector';
import styles from './ConnectorBadge.module.css';

interface ConnectorBadgeProps {
  connector: Connector;
  /** The tucked card's active text, shown after each word as a preview. */
  nextText: string;
  onChoose: (word: string) => void;
}

/** Gap between the badge and the list, and the list's margin from the window edge. */
const GAP = 6;

/** Events inside the list must not reach the card node through the React tree. */
function stop(event: SyntheticEvent) {
  event.stopPropagation();
}

export function ConnectorBadge({ connector, nextText, onChoose }: ConnectorBadgeProps) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const menuId = useId();
  const badge = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    connector.options.findIndex((option) => option.word === connector.word),
  );

  // Place the list under the badge, or above it when the window has no room below.
  useLayoutEffect(() => {
    if (!open || !badge.current || !menu.current) return;
    const at = badge.current.getBoundingClientRect();
    const size = menu.current.getBoundingClientRect();
    const below = at.bottom + GAP;
    const top =
      below + size.height <= window.innerHeight - GAP
        ? below
        : Math.max(GAP, at.top - GAP - size.height);
    const left = Math.min(Math.max(GAP, at.left), window.innerWidth - GAP - size.width);
    setPlace({ left, top });
  }, [open]);

  // A pointerdown elsewhere, a wheel turn (pan or zoom) and a window resize close the list.
  useEffect(() => {
    if (!open) return;
    const shut = () => {
      setOpen(false);
      setPlace(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!badge.current?.contains(target) && !menu.current?.contains(target)) shut();
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('wheel', shut, { passive: true });
    window.addEventListener('resize', shut);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('wheel', shut);
      window.removeEventListener('resize', shut);
    };
  }, [open]);

  // Once the list is placed (it is hidden until then, and hidden rows cannot take focus),
  // focus the current word. current is read only then: a change while open must not move focus.
  const placed = place !== null;
  useEffect(() => {
    if (open && placed) rows.current[current]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placed]);

  function close() {
    setOpen(false);
    setPlace(null);
    badge.current?.focus();
  }

  function onBadgeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close();
      return;
    }
    const count = connector.options.length;
    const at = rows.current.findIndex((row) => row === document.activeElement);
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = (at + 1) % count;
    if (event.key === 'ArrowUp') next = (at - 1 + count) % count;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = count - 1;
    if (next === null) return;
    event.preventDefault();
    rows.current[next]?.focus();
  }

  return (
    <>
      <button
        ref={badge}
        type="button"
        className={`${styles.badge} nodrag nopan`}
        style={{ background: `var(--deck-${connector.type})` }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Connector: ${connector.text}`}
        data-testid="connector-badge"
        onPointerDown={stop}
        onClick={(event) => {
          event.stopPropagation();
          if (open) close();
          else setOpen(true);
        }}
        onKeyDown={onBadgeKeyDown}
      >
        {connector.text}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label="Connector"
            className={styles.menu}
            style={place ?? { visibility: 'hidden', left: 0, top: 0 }}
            data-testid="connector-menu"
            onKeyDown={onMenuKeyDown}
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={stop}
            onDoubleClick={stop}
          >
            {connector.options.map((option, i) => {
              const chosen = option.word === connector.word;
              return (
                <button
                  key={option.word}
                  ref={(element) => {
                    rows.current[i] = element;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={chosen}
                  className={styles.row}
                  onClick={() => {
                    if (!chosen) onChoose(option.word);
                    close();
                  }}
                >
                  <span className={styles.check}>{chosen && <Icon name="check" size={16} />}</span>
                  <span className={styles.word}>{option.text}</span>
                  <span className={styles.preview}>{nextText}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
