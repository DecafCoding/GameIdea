/**
 * The storage seam (storage-seam in docs/architecture.html): the 5 actions the rest of the
 * app uses to read and write boards. Each save writes the board record and its index row
 * in one transaction (save-transaction), then posts the board id on a BroadcastChannel so
 * other tabs can reload it (tab-sync). The first action call asks the browser once for
 * persistent storage (persistent-storage); a refusal or a missing API changes nothing.
 */
import type { BoardIndexRow, BoardRecord } from '@/shared/model';
import { db } from './db';

const CHANNEL_NAME = 'theforge-boards';

interface BoardMessage {
  boardId: string;
}

let channel: BroadcastChannel | null | undefined;

/** The one channel object for this tab, or null where BroadcastChannel is missing. */
function boardChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

let persistenceRequested = false;

function requestPersistence(): void {
  if (persistenceRequested) return;
  persistenceRequested = true;
  try {
    // A refusal, a missing API or an error all leave storage as it is.
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Some engines throw synchronously outside a secure context; nothing to do.
  }
}

function postChange(boardId: string): void {
  const message: BoardMessage = { boardId };
  boardChannel()?.postMessage(message);
}

/** The board list rows, newest first by updatedAt. */
export async function listBoards(): Promise<BoardIndexRow[]> {
  requestPersistence();
  return db().boardIndex.orderBy('updatedAt').reverse().toArray();
}

/** The saved board with this id, or null when there is none. */
export async function loadBoard(id: string): Promise<BoardRecord | null> {
  requestPersistence();
  return (await db().boards.get(id)) ?? null;
}

/**
 * Saves the record and its index row in one transaction, then tells other tabs. Rejects on
 * any error; the transaction rolls back, so the last good version stays.
 */
export async function saveBoard(record: BoardRecord): Promise<void> {
  requestPersistence();
  const database = db();
  const row: BoardIndexRow = {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  await database.transaction('rw', database.boards, database.boardIndex, async () => {
    await database.boards.put(record);
    await database.boardIndex.put(row);
  });
  postChange(record.id);
}

/** Deletes the board and its index row in one transaction, then tells other tabs. */
export async function deleteBoard(id: string): Promise<void> {
  requestPersistence();
  const database = db();
  await database.transaction('rw', database.boards, database.boardIndex, async () => {
    await database.boards.delete(id);
    await database.boardIndex.delete(id);
  });
  postChange(id);
}

/**
 * Calls the handler with the board id each time another tab saves or deletes a board.
 * A channel object never receives its own messages, so this tab's saves never call it.
 * Returns the unsubscribe.
 */
export function onBoardChangedElsewhere(handler: (boardId: string) => void): () => void {
  const ch = boardChannel();
  if (!ch) return () => undefined;
  const listener = (event: MessageEvent<BoardMessage>) => {
    const id = event.data?.boardId;
    if (typeof id === 'string') handler(id);
  };
  ch.addEventListener('message', listener);
  return () => ch.removeEventListener('message', listener);
}

/** Tests only: closes the channel and forgets the persistence request. */
export function resetStorageForTests(): void {
  channel?.close();
  channel = undefined;
  persistenceRequested = false;
}
