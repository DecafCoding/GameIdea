/**
 * ExportButton: the board top bar's Export button and its 2-row menu (design section 9.9),
 * built on the ARIA menu-button pattern. A row click downloads the text file or the board
 * file at once, closes the menu and returns focus to the button. getBoard is read at click
 * time, so the download always has the latest board; the store stays in app/.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { BoardRecord } from '@/shared/model';
import { Icon, type IconName } from '@/shared/ui';
import { boardFileName, downloadBoardFile } from './boardFile';
import { downloadTextFile, textFileName } from './textFile';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  /** The board name, for the file names shown in the menu. */
  name: string;
  getBoard: () => BoardRecord;
}

interface Row {
  icon: IconName;
  title: string;
  caption: string;
  fileName: string;
  download: (board: BoardRecord) => void;
}

export function ExportButton({ name, getBoard }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);

  const items: Row[] = [
    {
      icon: 'file-text',
      title: 'Text File',
      caption: 'The cards and notes of this board in plain words. For your notebook or your draft.',
      fileName: textFileName(name),
      download: downloadTextFile,
    },
    {
      icon: 'board-file',
      title: 'Board File',
      caption: 'All data of this board. Import it again on any computer. This is your backup.',
      fileName: boardFileName(name),
      download: downloadBoardFile,
    },
  ];

  // Opening focuses the first row; a pointerdown outside the button and the menu closes it.
  useEffect(() => {
    if (!open) return;
    rows.current[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const current = rows.current.findIndex((row) => row === document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + step + items.length) % items.length;
    rows.current[next]?.focus();
  }

  return (
    <div ref={wrapper} className={styles.wrapper}>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="download" size={16} />
        Export
        <Icon name="chevron-down" size={12} className={open ? styles.chevronOpen : undefined} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Export"
          className={styles.menu}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, i) => (
            <button
              key={item.title}
              ref={(element) => {
                rows.current[i] = element;
              }}
              type="button"
              role="menuitem"
              className={styles.row}
              onClick={() => {
                item.download(getBoard());
                close();
              }}
            >
              <Icon name={item.icon} size={20} className={styles.rowIcon} />
              <span className={styles.rowText}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.caption}>{item.caption}</span>
                <span className={styles.fileName}>{item.fileName}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
