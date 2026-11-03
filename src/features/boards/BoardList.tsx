/**
 * BoardList: the board list page body at #/ (design 9.8): the "Boards" header with Import
 * Board File and New Board, one row per saved board newest first, and the footer line.
 * New Board opens the 2-step New Board dialog; Create Board saves a board with the chosen
 * name and deck genres and opens it; Cancel and Esc create nothing and return focus to New
 * Board. Import keeps the file's genres and skips the dialog.
 * Import reads a board file through the export feature and saves it as a new board; the new
 * row is highlighted with a status message for a short time, and a bad file shows the
 * bad-import banner (design 9.10) and changes nothing. It reads storage only through the
 * seam and re-reads when another tab changes a board. It knows nothing of the
 * address format: app/ passes boardHref and onOpen.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  BAD_IMPORT_TEXT,
  IMPORTED_RENAMED_TEXT,
  IMPORTED_TEXT,
  importedBoard,
  readBoardFile,
} from '@/features/export';
import {
  deleteBoard,
  listBoards,
  loadBoard,
  onBoardChangedElsewhere,
  saveBoard,
  whenSaved,
} from '@/shared/storage';
import { newId, type DeckGenres } from '@/shared/model';
import { newBoard } from '@/shared/store';
import { Banner, Button, Icon } from '@/shared/ui';
import { BoardRow } from './BoardRow';
import { DeleteBoardDialog } from './DeleteBoardDialog';
import { GenreDialog } from './GenreDialog';
import { ImportStatus } from './ImportStatus';
import { summarize, type BoardSummary } from './summary';
import styles from './BoardList.module.css';

/** How long the imported row stays highlighted with its status message. */
export const IMPORT_NOTICE_MS = 6000;

interface BoardListProps {
  boardHref: (id: string) => string;
  onOpen: (id: string) => void;
}

/** The saved boards as row summaries, newest first. A failed read shows no rows. */
async function readSummaries(): Promise<BoardSummary[]> {
  try {
    await whenSaved();
    const rows = await listBoards();
    const boards = await Promise.all(rows.map((row) => loadBoard(row.id)));
    return boards.flatMap((board) => (board ? [summarize(board)] : []));
  } catch {
    // The design has no list-level storage error; the list shows no rows.
    return [];
  }
}

export function BoardList({ boardHref, onOpen }: BoardListProps) {
  const [summaries, setSummaries] = useState<BoardSummary[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [creating, setCreating] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const newBoardButton = useRef<HTMLButtonElement>(null);
  // Set by Cancel and Esc: focus goes back to New Board once the dialog has unmounted.
  const returnFocus = useRef(false);
  const [deleting, setDeleting] = useState<BoardSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [badImport, setBadImport] = useState(false);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    const next = await readSummaries();
    setSummaries(next);
    setNow(new Date());
  }, []);

  useEffect(() => {
    let live = true;
    const reload = () => {
      void readSummaries().then((next) => {
        if (!live) return;
        setSummaries(next);
        setNow(new Date());
      });
    };
    reload();
    const unsubscribe = onBoardChangedElsewhere(reload);
    return () => {
      live = false;
      unsubscribe();
      clearTimeout(noticeTimer.current);
    };
  }, []);

  /** Ends the imported row's highlight and its status message. */
  function clearNotice() {
    clearTimeout(noticeTimer.current);
    setNotice(null);
  }

  function chooseFile() {
    fileInput.current?.click();
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so that choosing the same file again still fires a change.
    event.target.value = '';
    if (!file) return;
    setBadImport(false);
    clearNotice();
    setImporting(true);
    try {
      const board = await readBoardFile(file);
      if (!board) {
        setBadImport(true);
        return;
      }
      const names = (await listBoards()).map((row) => row.name);
      const result = importedBoard(board, names, {
        id: newId(),
        now: new Date().toISOString(),
      });
      await saveBoard(result.board);
      await refresh();
      setNotice({
        id: result.board.id,
        text: result.renamed ? IMPORTED_RENAMED_TEXT : IMPORTED_TEXT,
      });
      noticeTimer.current = setTimeout(() => setNotice(null), IMPORT_NOTICE_MS);
    } catch {
      // A storage error leaves the list as it is, with no message.
    } finally {
      setImporting(false);
    }
  }

  /** New Board: asks for the name and deck genres first. */
  function startNewBoard() {
    clearNotice();
    setChoosing(true);
  }

  function cancelNewBoard() {
    returnFocus.current = true;
    setChoosing(false);
  }

  // Focus cannot leave a modal while it is mounted, so this runs after the unmount.
  useEffect(() => {
    if (choosing || !returnFocus.current) return;
    returnFocus.current = false;
    newBoardButton.current?.focus();
  }, [choosing]);

  async function createBoard(name: string, genres: DeckGenres) {
    setChoosing(false);
    clearNotice();
    setCreating(true);
    const board = newBoard({ name, genres });
    try {
      await saveBoard(board);
    } catch {
      // Nothing saved, so nothing opens; the button comes back.
      setCreating(false);
      return;
    }
    onOpen(board.id);
  }

  async function rename(id: string, name: string) {
    clearNotice();
    try {
      const board = await loadBoard(id);
      if (board) await saveBoard({ ...board, name, updatedAt: new Date().toISOString() });
    } catch {
      // The old name stays in storage and in the list.
    }
    await refresh();
  }

  async function confirmDelete() {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    clearNotice();
    try {
      await deleteBoard(target.id);
    } catch {
      // The board stays; the re-read shows it.
    }
    await refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Boards</h1>
          <p className={styles.caption}>
            Each board holds one story idea: its cards and its premise.
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            className={styles.withIcon}
            disabled={importing}
            onClick={chooseFile}
          >
            <Icon name="upload" size={16} />
            Import Board File
          </Button>
          <Button
            variant="primary"
            className={styles.withIcon}
            ref={newBoardButton}
            disabled={creating}
            onClick={startNewBoard}
          >
            <Icon name="plus" size={16} />
            New Board
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="import-file"
          onChange={(event) => void onFileChosen(event)}
        />
      </div>
      {badImport && (
        <Banner
          kind="warning"
          icon="file-x"
          text={BAD_IMPORT_TEXT}
          actionLabel="Choose Another File"
          onAction={chooseFile}
        />
      )}
      {notice && <ImportStatus text={notice.text} />}
      {summaries !== null && summaries.length > 0 && (
        <ul className={styles.list} aria-label="Saved Boards">
          {summaries.map((summary) => (
            <BoardRow
              key={summary.id}
              summary={summary}
              href={boardHref(summary.id)}
              now={now}
              onRename={rename}
              onDelete={setDeleting}
              highlighted={summary.id === notice?.id}
            />
          ))}
        </ul>
      )}
      <p className={styles.footer}>
        Boards save in this browser after each change. Export a board file to keep a copy outside
        the browser.
      </p>
      {choosing && (
        <GenreDialog
          open
          onCancel={cancelNewBoard}
          onCreate={(name, genres) => void createBoard(name, genres)}
        />
      )}
      <DeleteBoardDialog
        name={deleting?.name ?? null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
