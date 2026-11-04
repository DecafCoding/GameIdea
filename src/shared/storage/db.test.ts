/**
 * Tests for the Dexie database on fake-indexeddb: the "gameidea" database opens at schema
 * version 2 with the boards and boardIndex tables, and a version 1 record saved by a
 * version 1 database comes out as a Free Form version 2 board.
 */
import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { version1BoardFile } from '@/test/fixtures/boards';
import { loadBoard, resetStorageForTests } from './boardStorage';
import { DB_NAME, openDb, resetDbForTests } from './db';

afterEach(async () => {
  resetStorageForTests();
  await resetDbForTests();
});

/** The database as a build before format version 2 declared it. */
class V1Db extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
  }
}

const INDEX_ROW = {
  id: 'v1-board',
  name: 'Round Trip',
  createdAt: '2026-02-03T04:05:06.000Z',
  updatedAt: '2026-03-04T05:06:07.000Z',
};

/** Saves a version 1 record and its index row through a version 1 database, then closes it. */
async function saveVersion1Record(): Promise<void> {
  const old = new V1Db();
  await old.open();
  await old.table('boards').put({ ...version1BoardFile(), id: 'v1-board' });
  await old.table('boardIndex').put(INDEX_ROW);
  old.close();
}

describe('db', () => {
  it('db_freshDatabase_opensAtSchemaVersion2WithBothTables', async () => {
    const handle = openDb();
    await handle.open();
    expect(handle.name).toBe(DB_NAME);
    expect(handle.verno).toBe(2);
    expect(handle.tables.map((table) => table.name).sort()).toEqual(['boardIndex', 'boards']);
    handle.close();
  });

  it('db_version1Record_upgradesToFreeFormV2', async () => {
    await saveVersion1Record();
    const handle = openDb();
    await handle.open();
    const record = (await handle.boards.get('v1-board'))!;
    expect(record.formatVersion).toBe(2);
    expect(record.kind).toBe('free');
    expect('conceptWidth' in record).toBe(false);
    expect(record.cards.length).toBeGreaterThan(0);
    expect(record.cards.every((card) => card.inConcept === false)).toBe(true);
    expect(await handle.boardIndex.get('v1-board')).toEqual(INDEX_ROW);
    handle.close();
  });

  it('db_version1Record_loadsThroughSeam', async () => {
    await saveVersion1Record();
    const board = (await loadBoard('v1-board'))!;
    expect(board.kind).toBe('free');
    expect(board.formatVersion).toBe(2);
    expect(board.cards.every((card) => card.inConcept === false)).toBe(true);
  });
});
