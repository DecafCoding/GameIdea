/**
 * Tests for the Dexie database on fake-indexeddb: the "gameidea" database opens at schema
 * version 1, the only version, with the boards and boardIndex tables.
 */
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DB_NAME, openDb, resetDbForTests } from './db';

afterEach(async () => {
  await resetDbForTests();
});

describe('db', () => {
  it('db_freshDatabase_opensAtSchemaVersion1WithBothTables', async () => {
    const handle = openDb();
    await handle.open();
    expect(handle.name).toBe(DB_NAME);
    expect(handle.verno).toBe(1);
    expect(handle.tables.map((table) => table.name).sort()).toEqual(['boardIndex', 'boards']);
    handle.close();
  });
});
