/**
 * The open board's store (state-store and undo-history in docs/architecture.html), built
 * with Zustand and zundo.
 *
 * Contract:
 * - One changeBoard call is one finished change: one undo step and one save.
 * - setView (pan and zoom) saves but is never an undo step and does not stamp updatedAt.
 * - openBoard is not an undo step, clears the history and does not save unless asked.
 * - undo and redo restore the board but keep the current view; each one saves.
 * - saveSeq counts finished changes. The autosave watcher in shared/storage saves when it
 *   changes, so loading a board never saves.
 * - Selection, hover, drag and editing state never enter this store; they live in
 *   React state in the features that own them.
 * Undo keeps up to 100 steps for the session only. Board rules are pure Board → Board
 * recipes owned by the features, because shared/ may not import features/.
 */
import { create, useStore, type StoreApi } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { temporal, type TemporalState } from 'zundo';
import type { Board, BoardView } from '@/shared/model';
import { newBoard } from './newBoard';

export const UNDO_LIMIT = 100;

export interface BoardState {
  board: Board;
  /** Counts finished changes; autosave saves each time it changes. */
  saveSeq: number;
  /**
   * Replaces the open board and clears undo history. Not an undo step. Saves only with
   * { save: true }.
   */
  openBoard: (board: Board, options?: { save?: boolean }) => void;
  /**
   * Applies one finished change and stamps updatedAt. A recipe that returns the same
   * board object changes nothing: no stamp, no undo step, no save.
   */
  changeBoard: (recipe: (board: Board) => Board) => void;
  /** Stores pan and zoom. Saves; not an undo step, and it does not stamp updatedAt. */
  setView: (view: BoardView) => void;
  /** Steps back one change, keeping the current view. No-op with no history. */
  undo: () => void;
  /** Re-applies the last undone change, keeping the current view. */
  redo: () => void;
}

type Tracked = Pick<BoardState, 'board'>;

export const useBoardStore = create<BoardState>()(
  temporal(
    (set, get, store) => {
      // zundo types the store's temporal field as unknown inside the creator; it is the
      // history store for the tracked part of this state.
      const historyStore = () => store.temporal as StoreApi<TemporalState<Tracked>>;

      /** Sets state without recording an undo step. */
      function untracked(partial: Partial<BoardState>) {
        const history = historyStore().getState();
        history.pause();
        set(partial);
        history.resume();
      }

      /** Runs a zundo step, then puts the view back and stamps the board as a new change. */
      function step(direction: 'undo' | 'redo') {
        const history = historyStore().getState();
        const available =
          direction === 'undo' ? history.pastStates.length : history.futureStates.length;
        if (available === 0) return;
        const { view } = get().board;
        history[direction]();
        const { board, saveSeq } = get();
        untracked({
          board: { ...board, view, updatedAt: new Date().toISOString() },
          saveSeq: saveSeq + 1,
        });
      }

      return {
        board: newBoard(),
        saveSeq: 0,
        openBoard: (board, options) => {
          untracked(options?.save ? { board, saveSeq: get().saveSeq + 1 } : { board });
          historyStore().getState().clear();
        },
        changeBoard: (recipe) =>
          set((state) => {
            const next = recipe(state.board);
            if (next === state.board) return state;
            return {
              board: { ...next, updatedAt: new Date().toISOString() },
              saveSeq: state.saveSeq + 1,
            };
          }),
        setView: (view) => {
          const { board, saveSeq } = get();
          untracked({ board: { ...board, view }, saveSeq: saveSeq + 1 });
        },
        undo: () => step('undo'),
        redo: () => step('redo'),
      };
    },
    {
      limit: UNDO_LIMIT,
      partialize: (state): Tracked => ({ board: state.board }),
      equality: (a, b) => a.board === b.board,
    },
  ),
);

/** Whether Undo and Redo have a step to take, read reactively from the undo history. */
export function useUndoAvailability(): { canUndo: boolean; canRedo: boolean } {
  return useStore(
    useBoardStore.temporal,
    useShallow((history) => ({
      canUndo: history.pastStates.length > 0,
      canRedo: history.futureStates.length > 0,
    })),
  );
}
