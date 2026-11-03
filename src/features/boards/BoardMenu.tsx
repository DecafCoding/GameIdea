/**
 * BoardMenu: the More menu of a board card (design 9.3): Rename, Export Board File and
 * Delete. Opening focuses the first item; the arrow keys move between items; Esc and a
 * click outside close it, and Esc returns focus to the More button.
 */
import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Icon, type IconName } from '@/shared/ui';
import styles from './BoardCard.module.css';

interface BoardMenuProps {
  id: string;
  /** The card name, for the menu's accessible name. */
  name: string;
  /** The More button and the menu: a pointerdown outside both closes the menu. */
  wrapper: RefObject<HTMLElement | null>;
  onClose: (returnFocus: boolean) => void;
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}

interface Item {
  label: string;
  icon: IconName;
  danger?: boolean;
  run: () => void;
}

export function BoardMenu({
  id,
  name,
  wrapper,
  onClose,
  onRename,
  onExport,
  onDelete,
}: BoardMenuProps) {
  const items: Item[] = [
    { label: 'Rename', icon: 'pencil', run: onRename },
    { label: 'Export Board File', icon: 'board-file', run: onExport },
    { label: 'Delete', icon: 'trash', danger: true, run: onDelete },
  ];
  const rows = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    rows.current[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [wrapper, onClose]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const current = rows.current.findIndex((row) => row === document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    rows.current[(current + step + items.length) % items.length]?.focus();
  }

  return (
    <div
      id={id}
      role="menu"
      aria-label={`More For ${name}`}
      className={styles.menu}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          ref={(el) => {
            rows.current[i] = el;
          }}
          type="button"
          role="menuitem"
          className={item.danger ? `${styles.menuItem} ${styles.danger}` : styles.menuItem}
          onClick={() => {
            onClose(false);
            item.run();
          }}
        >
          <Icon name={item.icon} size={16} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
