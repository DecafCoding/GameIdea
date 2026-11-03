/**
 * The Dexie database "gameidea" (schema-shape in docs/architecture.html): the boards table
 * holds each full BoardRecord by id, and boardIndex holds the list rows by id with an
 * updatedAt index. Only indexed fields are declared; the record is stored whole.
 * Schema version 1 is the only version (schema-versions). A later shape change adds a
 * this.version(n) with an upgrade step here and a board file step in export/upgrade.ts.
 * Nothing opens the database at module load, so importing this module never needs IndexedDB.
 */
import { Dexie, type EntityTable } from 'dexie';
import type { BoardIndexRow, BoardRecord } from '@/shared/model';

export const DB_NAME = 'gameidea';

export class GameIdeaDb extends Dexie {
  boards!: EntityTable<BoardRecord, 'id'>;
  boardIndex!: EntityTable<BoardIndexRow, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
  }
}

/** Opens a new handle on the database. */
export function openDb(): GameIdeaDb {
  return new GameIdeaDb();
}

let instance: GameIdeaDb | null = null;

/** The module's one database handle, created on first use. */
export function db(): GameIdeaDb {
  instance ??= openDb();
  return instance;
}

/** Tests only: closes the handle and deletes the database, so each test starts empty. */
export async function resetDbForTests(): Promise<void> {
  instance?.close();
  instance = null;
  await Dexie.delete(DB_NAME);
}
