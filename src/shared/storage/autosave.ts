/**
 * The autosave watcher (state-store: "the storage module watches the store for autosave").
 * It saves the open board each time the board store's saveSeq changes, so each finished
 * change saves once and a load never saves. One save runs at a time; changes that arrive
 * during a save coalesce into one more save of the newest board. The save status store
 * shows saving, saved or failed for the save mark and the save-failed banner.
 */
import { useBoardStore, useSaveStatus } from '@/shared/store';
import { saveBoard } from './boardStorage';

let stop: (() => void) | null = null;
let running: Promise<void> | null = null;
let pending = false;

/** Saves the newest board until no change is pending. Never rejects. */
async function drain(): Promise<void> {
  const { setStatus } = useSaveStatus.getState();
  let failed = false;
  while (pending) {
    pending = false;
    setStatus('saving');
    try {
      await saveBoard(useBoardStore.getState().board);
      failed = false;
    } catch {
      // The save mark and the save-failed banner report it; the last good version stays.
      failed = true;
    }
  }
  setStatus(failed ? 'failed' : 'saved');
}

function queueSave(): void {
  pending = true;
  if (running) return;
  running = drain().finally(() => {
    running = null;
  });
}

/** Starts watching the board store. A second call while active is a no-op. Returns the stop. */
export function startAutosave(): () => void {
  if (stop) return stop;
  const unsubscribe = useBoardStore.subscribe((state, previous) => {
    if (state.saveSeq !== previous.saveSeq) queueSave();
  });
  stop = () => {
    unsubscribe();
    stop = null;
  };
  return stop;
}

/** Resolves when no save is running or queued. Never rejects. */
export async function whenSaved(): Promise<void> {
  while (running) await running;
}
