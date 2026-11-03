/**
 * BoardScreen: the board screen (design sections 8 and 9.1): the top bar, the side rail
 * and the canvas, with the banners under the top bar (design 9.10) and the empty board
 * panel. Deck buttons draw into open space near the center of the view with the draw
 * motion, using only cues that share a genre with that deck's list on the board. The board
 * is the open board in the store, which the route loads from storage;
 * Ctrl+Z and Ctrl+Shift+Z undo and redo.
 */
import { useState } from 'react';
import {
  BoardCanvas,
  boardRects,
  CanvasProvider,
  CARD_SIZE,
  findOpenSpot,
  HOOK_WIDTH,
  placeHookCard,
  placeNewCard,
  useCanvasApi,
} from '@/features/canvas';
import { drawCard } from '@/features/draw';
import { downloadBoardFile } from '@/features/export';
import { addNote, NOTE_SIZE } from '@/features/notes';
import { GENRE_DECKS, newId, type Deck, type GenreDeck, type ModDeck } from '@/shared/model';
import { usePools } from '@/shared/pools';
import { useBoardStore, useSaveStatus } from '@/shared/store';
import { Banner } from '@/shared/ui';
import { EmptyBoardPanel } from './EmptyBoardPanel';
import { SideRail } from './SideRail';
import { TopBar } from './TopBar';
import { useUndoKeys } from './useUndoKeys';
import styles from './BoardScreen.module.css';

export const POOLS_FAILED_TEXT =
  'The decks did not load. Saved cards still work. The deck buttons are off until the decks load.';

export const SAVE_FAILED_TEXT =
  'The board did not save. The browser storage may be full. Export a board file to keep your work.';

export const HOOK_CANNOT_TUCK_TEXT =
  'A Hook Card is always the head of its stack. It cannot tuck under a card.';

export const CHANGED_ELSEWHERE_TEXT =
  'This board changed in another tab. It reloaded here. Undo history was cleared.';

interface BoardScreenProps {
  /** Another tab changed this board and it reloaded here: shows the status banner. */
  changedElsewhere?: boolean;
  onDismissChangedElsewhere?: () => void;
}

export function BoardScreen(props: BoardScreenProps) {
  return (
    <CanvasProvider>
      <BoardScreenBody {...props} />
    </CanvasProvider>
  );
}

function BoardScreenBody({
  changedElsewhere = false,
  onDismissChangedElsewhere = () => undefined,
}: BoardScreenProps) {
  useUndoKeys();
  const saveFailed = useSaveStatus((state) => state.status === 'failed');
  const { status, pools, retry } = usePools();
  const board = useBoardStore((state) => state.board);
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const canvas = useCanvasApi();
  // The board id on which something was drawn or added this session: the panel stays away.
  const [startedOn, setStartedOn] = useState<string | null>(null);

  const ready = status === 'ready' && pools !== null;
  const empty = board.cards.length === 0 && board.notes.length === 0;
  const showPanel = empty && startedOn !== board.id;

  function draw(type: Deck, from: DOMRect, modDeck?: ModDeck) {
    if (!pools) return;
    const filter = (GENRE_DECKS as readonly Deck[]).includes(type)
      ? { genres: board.genres[type as GenreDeck] }
      : type === 'modifier'
        ? { modDeck: modDeck ?? 'role' }
        : {};
    const card = drawCard(type, pools[type], filter);
    const center = canvas.viewCenter();
    const half = CARD_SIZE / 2;
    const spot = findOpenSpot({ x: center.x - half, y: center.y - half }, boardRects(board), {
      width: CARD_SIZE,
      height: CARD_SIZE,
    });
    changeBoard((b) => placeNewCard(b, card, spot));
    setStartedOn(board.id);
    canvas.flyIn(card.id, from);
  }

  /** Places a new Hook Card at the open 240 × 200 spot nearest the view center. */
  function drawHook(from: DOMRect) {
    const id = newId();
    const center = canvas.viewCenter();
    const start = { x: center.x - HOOK_WIDTH / 2, y: center.y - CARD_SIZE / 2 };
    const spot = findOpenSpot(start, boardRects(board), { width: HOOK_WIDTH, height: CARD_SIZE });
    changeBoard((b) => placeHookCard(b, id, spot));
    setStartedOn(board.id);
    canvas.flyIn(id, from);
  }

  function addNoteNow() {
    const id = newId();
    const center = canvas.viewCenter();
    const start = { x: center.x - NOTE_SIZE.width / 2, y: center.y - NOTE_SIZE.height / 2 };
    changeBoard((b) => addNote(b, findOpenSpot(start, boardRects(b), NOTE_SIZE), id));
    setStartedOn(board.id);
    canvas.editNote(id);
  }

  return (
    <main className={styles.screen} aria-label="Board">
      <TopBar />
      <SideRail decksReady={ready} onDraw={draw} onDrawHook={drawHook} onAddNote={addNoteNow} />
      <div className={styles.region} data-testid="canvas-region">
        {(saveFailed || changedElsewhere || status === 'failed' || canvas.notice) && (
          <div className={styles.banners}>
            {saveFailed && (
              <Banner
                kind="warning"
                text={SAVE_FAILED_TEXT}
                actionLabel="Export Board File"
                actionVariant="primary"
                onAction={() => downloadBoardFile(useBoardStore.getState().board)}
              />
            )}
            {changedElsewhere && (
              <Banner
                kind="status"
                text={CHANGED_ELSEWHERE_TEXT}
                actionLabel="Dismiss"
                onAction={onDismissChangedElsewhere}
              />
            )}
            {canvas.notice === 'hookCannotTuck' && (
              <Banner
                kind="warning"
                text={HOOK_CANNOT_TUCK_TEXT}
                actionLabel="Dismiss"
                onAction={canvas.dismissNotice}
              />
            )}
            {status === 'failed' && (
              <Banner
                kind="warning"
                text={POOLS_FAILED_TEXT}
                actionLabel="Retry"
                onAction={retry}
              />
            )}
          </div>
        )}
        <BoardCanvas pools={pools} />
        {showPanel && <EmptyBoardPanel decksReady={ready} onDraw={draw} />}
      </div>
    </main>
  );
}
