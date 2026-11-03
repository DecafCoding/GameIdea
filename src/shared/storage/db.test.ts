/**
 * Tests for the Dexie schema upgrades on fake-indexeddb: a board stored by schema version 1
 * (no genres, formatVersion 1) comes back through the seam with all 4 genres in every deck,
 * and a board stored by schema version 2 (1 flat list) gets that list in every deck.
 */
import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { everyDeck, FORMAT_VERSION, GENRES, type Board, type Note } from '@/shared/model';
import { fixtureBoard, fixtureCard, fixtureNote } from '@/test/fixtures/boards';
import { listBoards, loadBoard, resetStorageForTests } from './boardStorage';
import { DB_NAME, resetDbForTests } from './db';

/** The fixture board as version 1 stored it: no genres, formatVersion 1. */
function version1Board(): Record<string, unknown> {
  const board: Partial<Board> = {
    ...fixtureBoard([fixtureCard('character')], [fixtureNote({ text: 'Old note.' })]),
    id: 'old-board',
    name: 'Old Board',
  };
  delete board.genres;
  // Notes had no title before version 4.
  const notes = board.notes!.map((note) => {
    const old: Partial<Note> = { ...note };
    delete old.title;
    return old;
  });
  return { ...board, notes, formatVersion: 1 };
}

/** Writes a record with a database that only knows schema version 1, then closes it. */
async function seedVersion1(record: Record<string, unknown>): Promise<void> {
  const old = new Dexie(DB_NAME);
  old.version(1).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
  await old.table('boards').put(record);
  await old.table('boardIndex').put({
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
  old.close();
}

/** The fixture board as version 2 stored it: 1 flat genre list, formatVersion 2. */
function version2Board(): Record<string, unknown> {
  return { ...version1Board(), genres: ['cyberpunk'], formatVersion: 2 };
}

/** Writes a record with a database that knows schema versions 1 and 2, then closes it. */
async function seedVersion2(record: Record<string, unknown>): Promise<void> {
  const old = new Dexie(DB_NAME);
  old.version(1).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
  old.version(2).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
  await old.table('boards').put(record);
  await old.table('boardIndex').put({
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
  old.close();
}

/** The old notes as the version 4 upgrade leaves them. */
function withPremiseTitles(notes: unknown): unknown {
  return (notes as object[]).map((note) => ({ ...note, title: 'Premise' }));
}

beforeEach(async () => {
  resetStorageForTests();
  await resetDbForTests();
});

afterEach(async () => {
  resetStorageForTests();
  await resetDbForTests();
});

describe('db upgrade', () => {
  it('dbUpgrade_version1Board_getsAllGenresInEveryDeckAndVersion3', async () => {
    await seedVersion1(version1Board());
    const board = await loadBoard('old-board');
    expect(board?.genres).toEqual(everyDeck(GENRES));
    expect(board?.formatVersion).toBe(FORMAT_VERSION);
  });

  it('dbUpgrade_version2Board_copiesItsGenresToEveryDeck', async () => {
    await seedVersion2(version2Board());
    const board = await loadBoard('old-board');
    expect(board?.genres).toEqual(everyDeck(['cyberpunk']));
    expect(board?.formatVersion).toBe(FORMAT_VERSION);
  });

  it('dbUpgrade_version2Board_keepsCardsAndNotes', async () => {
    const old = version2Board();
    await seedVersion2(old);
    const board = await loadBoard('old-board');
    expect(board?.cards).toEqual(old.cards);
    expect(board?.notes).toEqual(withPremiseTitles(old.notes));
    expect((await listBoards()).map((row) => row.id)).toEqual(['old-board']);
  });

  it('dbUpgrade_version1Board_keepsCardsAndNotes', async () => {
    const old = version1Board();
    await seedVersion1(old);
    const board = await loadBoard('old-board');
    expect(board?.cards).toEqual(old.cards);
    expect(board?.notes).toEqual(withPremiseTitles(old.notes));
    expect(board?.name).toBe('Old Board');
  });

  it('dbUpgrade_version1Board_listBoardsStillListsIt', async () => {
    await seedVersion1(version1Board());
    expect((await listBoards()).map((row) => row.id)).toEqual(['old-board']);
  });
});
