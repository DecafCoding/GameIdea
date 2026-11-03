/**
 * useBoardLoader: loads the route's board from storage into the board store, after any
 * save still running, and reloads it when another tab saves it (tab-sync in
 * docs/architecture.html). Each load opens the board, which clears undo history, and bumps
 * loadKey so the board screen remounts and shows the saved view. A missing board, a failed
 * read, or a board deleted in another tab goes to the board list.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadBoard, onBoardChangedElsewhere, whenSaved } from '@/shared/storage';
import { useBoardStore } from '@/shared/store';

export interface BoardLoad {
  state: 'loading' | 'ready';
  /** Changes on every load; the board screen's key. */
  loadKey: number;
  /** True after a reload caused by another tab, until dismissed or the next load. */
  changedElsewhere: boolean;
  dismissChangedElsewhere: () => void;
}

interface Loaded {
  id: string;
  loadKey: number;
  changedElsewhere: boolean;
}

function goToList() {
  window.location.replace('#/');
}

export function useBoardLoader(id: string): BoardLoad {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let live = true;
    async function load(fromElsewhere: boolean) {
      try {
        await whenSaved();
        const board = await loadBoard(id);
        if (!live) return;
        if (!board) {
          goToList();
          return;
        }
        useBoardStore.getState().openBoard(board);
        setLoaded((previous) => ({
          id,
          loadKey: (previous?.loadKey ?? 0) + 1,
          changedElsewhere: fromElsewhere,
        }));
      } catch {
        if (live) goToList();
      }
    }
    void load(false);
    const unsubscribe = onBoardChangedElsewhere((boardId) => {
      if (boardId === id) void load(true);
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [id]);

  const dismissChangedElsewhere = useCallback(() => {
    setLoaded((previous) => previous && { ...previous, changedElsewhere: false });
  }, []);

  const ready = loaded !== null && loaded.id === id;
  return {
    state: ready ? 'ready' : 'loading',
    loadKey: loaded?.loadKey ?? 0,
    changedElsewhere: ready && loaded.changedElsewhere,
    dismissChangedElsewhere,
  };
}
