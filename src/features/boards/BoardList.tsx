/**
 * BoardList: the board list page body at #/ (design 9.3): the "Boards" header with Import
 * Board File and New Board, then a grid of board cards newest first, or the "No Boards Yet"
 * box when there are none. Each card's More menu renames, exports the board file or
 * deletes.
 * New Board opens the name-only New Board dialog; Make Board saves a board with that name
 * and all 21 genres on and opens it; Cancel and Esc create nothing and return focus to New
 * Board. Import keeps the file's genres and skips the dialog.
 * Import reads a board file through the export feature and saves it as a new board; the new
 * card is highlighted with a status message for a short time, and a bad file shows the
 * bad-import banner (design 9.10) and changes nothing. It reads storage only through the
 * seam and re-reads when another tab changes a board. It knows nothing of the
 * address format: app/ passes boardHref and onOpen.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  BAD_IMPORT_TEXT,
  downloadBoardFile,
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
import { newId } from '@/shared/model';
import { newBoard } from '@/shared/store';
import { Banner, Button, Icon } from '@/shared/ui';
import { BoardCard } from './BoardCard';
import { DeleteBoardDialog } from './DeleteBoardDialog';
import { NewBoardDialog } from './NewBoardDialog';
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

  async function createBoard(name: string) {
    setChoosing(false);
    clearNotice();
    setCreating(true);
    const board = newBoard({ name });
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

  async function exportBoard(id: string) {
    try {
      const board = await loadBoard(id);
      if (board) downloadBoardFile(board);
    } catch {
      // A storage error downloads nothing; the list stays as it is.
    }
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

  const importButton = (
    <Button
      variant="secondary"
      className={styles.withIcon}
      disabled={importing}
      onClick={chooseFile}
    >
      <Icon name="upload" size={16} />
      Import Board File
    </Button>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Boards</h1>
          <p className={styles.caption}>
            Each board is one place to draw cards and build hooks. Boards stay in this browser.
          </p>
        </div>
        <div className={styles.actions}>
          {importButton}
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
        <ul className={styles.grid} aria-label="Saved Boards">
          {summaries.map((summary) => (
            <BoardCard
              key={summary.id}
              summary={summary}
              href={boardHref(summary.id)}
              now={now}
              onRename={rename}
              onExport={(id) => void exportBoard(id)}
              onDelete={setDeleting}
              highlighted={summary.id === notice?.id}
            />
          ))}
        </ul>
      )}
      {summaries !== null && summaries.length === 0 && (
        <section className={styles.empty} aria-labelledby="no-boards-title">
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="board-file" size={24} />
          </span>
          <h2 id="no-boards-title" className={styles.emptyTitle}>
            No Boards Yet
          </h2>
          <p className={styles.emptyText}>
            Make a board to start drawing cards. Or import a board file from another computer.
          </p>
          <div className={styles.actions}>
            {importButton}
            <Button
              variant="primary"
              className={styles.withIcon}
              disabled={creating}
              onClick={startNewBoard}
            >
              <Icon name="plus" size={16} />
              New Board
            </Button>
          </div>
        </section>
      )}
      {choosing && (
        <NewBoardDialog
          open
          onCancel={cancelNewBoard}
          onCreate={(name) => void createBoard(name)}
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
