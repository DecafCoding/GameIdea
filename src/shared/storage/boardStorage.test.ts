/**
 * Tests for the storage seam on fake-indexeddb.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { board200, fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import {
  deleteBoard,
  listBoards,
  loadBoard,
  onBoardChangedElsewhere,
  resetStorageForTests,
  saveBoard,
} from './boardStorage';
import { db, resetDbForTests } from './db';

const channels: BroadcastChannel[] = [];

/** A second channel object, as another tab would hold. */
function otherTab(): BroadcastChannel {
  const ch = new BroadcastChannel('theforge-boards');
  channels.push(ch);
  return ch;
}

function board(id: string, updatedAt: string, name = id) {
  return { ...fixtureBoard([fixtureCard('character')]), id, name, updatedAt };
}

beforeEach(async () => {
  resetStorageForTests();
  await resetDbForTests();
});

afterEach(() => {
  for (const ch of channels.splice(0)) ch.close();
  resetStorageForTests();
  vi.restoreAllMocks();
});

describe('boardStorage', () => {
  it('saveBoard_newBoard_loadsBackEqual', async () => {
    const b = board('b1', '2026-01-01T00:00:00.000Z');
    await saveBoard(b);
    expect(await loadBoard('b1')).toEqual(b);
  });

  it('loadBoard_unknownId_returnsNull', async () => {
    expect(await loadBoard('missing')).toBeNull();
  });

  it('listBoards_threeBoards_newestFirst', async () => {
    await saveBoard(board('old', '2026-01-01T00:00:00.000Z'));
    await saveBoard(board('new', '2026-03-01T00:00:00.000Z'));
    await saveBoard(board('mid', '2026-02-01T00:00:00.000Z'));
    const rows = await listBoards();
    expect(rows.map((r) => r.id)).toEqual(['new', 'mid', 'old']);
    expect(rows[0]).toEqual({
      id: 'new',
      name: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('saveBoard_existing_updatesIndexRow', async () => {
    await saveBoard(board('b1', '2026-01-01T00:00:00.000Z', 'First'));
    await saveBoard(board('b1', '2026-02-01T00:00:00.000Z', 'Second'));
    const rows = await listBoards();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Second');
    expect(rows[0]!.updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('deleteBoard_saved_removesRecordAndIndexRow', async () => {
    await saveBoard(board('b1', '2026-01-01T00:00:00.000Z'));
    await deleteBoard('b1');
    expect(await loadBoard('b1')).toBeNull();
    expect(await listBoards()).toEqual([]);
  });

  it('saveBoard_indexWriteFails_keepsLastGoodVersion', async () => {
    const first = board('b1', '2026-01-01T00:00:00.000Z', 'Good');
    await saveBoard(first);
    vi.spyOn(db().boardIndex, 'put').mockRejectedValue(new Error('quota'));
    await expect(saveBoard(board('b1', '2026-02-01T00:00:00.000Z', 'Bad'))).rejects.toThrow();
    vi.restoreAllMocks();
    expect(await loadBoard('b1')).toEqual(first);
    expect((await listBoards())[0]!.name).toBe('Good');
  });

  it('saveBoard_saved_postsBoardIdToOtherChannels', async () => {
    const other = otherTab();
    const received = new Promise<unknown>((resolve) => {
      other.onmessage = (event: MessageEvent) => resolve(event.data);
    });
    await saveBoard(board('b1', '2026-01-01T00:00:00.000Z'));
    expect(await received).toEqual({ boardId: 'b1' });
  });

  it('onBoardChangedElsewhere_message_callsHandlerUntilUnsubscribed', async () => {
    const other = otherTab();
    const ids: string[] = [];
    let notify: () => void = () => undefined;
    const unsubscribe = onBoardChangedElsewhere((id) => {
      ids.push(id);
      notify();
    });
    await new Promise<void>((resolve) => {
      notify = resolve;
      other.postMessage({ boardId: 'b1' });
    });
    unsubscribe();
    other.postMessage({ boardId: 'b2' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ids).toEqual(['b1']);
  });

  it('actions_firstCall_requestsPersistenceOnce', async () => {
    const persist = vi.fn(() => Promise.resolve(false));
    vi.stubGlobal('navigator', { ...navigator, storage: { persist } });
    try {
      await listBoards();
      await loadBoard('x');
      await saveBoard(board('b1', '2026-01-01T00:00:00.000Z'));
      expect(persist).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('saveBoard_200Cards_under50ms', async () => {
    const big = board200();
    await saveBoard(big);
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await saveBoard({ ...big, updatedAt: new Date(Date.UTC(2026, 0, 2 + i)).toISOString() });
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
  });
});
