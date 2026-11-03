/**
 * The Dexie database "gameidea" (schema-shape in docs/architecture.html): the boards table
 * holds each full BoardRecord by id, and boardIndex holds the list rows by id with an
 * updatedAt index. Only indexed fields are declared; the record is stored whole.
 * Schema version 2 (schema-versions): same stores; its upgrade gives every stored version 1
 * board all 4 genres and formatVersion 2. Index rows do not change.
 * Schema version 3: same stores; its upgrade copies each board's list into all 5 decks and
 * sets formatVersion 3.
 * Schema version 4: same stores; its upgrade gives each note the title "Premise" (the old
 * fixed label) and sets formatVersion 4.
 * Schema version 5: same stores; cards may carry a connector word. Old cards have none, so
 * its upgrade only sets formatVersion 5.
 * Nothing opens the database at module load, so importing this module never needs IndexedDB.
 */
import { Dexie, type EntityTable } from 'dexie';
import {
  everyDeck,
  GENRES,
  type BoardIndexRow,
  type BoardRecord,
  type Genre,
} from '@/shared/model';

export const DB_NAME = 'gameidea';

export class GameIdeaDb extends Dexie {
  boards!: EntityTable<BoardRecord, 'id'>;
  boardIndex!: EntityTable<BoardIndexRow, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({ boards: 'id', boardIndex: 'id, updatedAt' });
    this.version(2)
      .stores({ boards: 'id', boardIndex: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('boards')
          .toCollection()
          .modify((board: Record<string, unknown>) => {
            // Version 1 had no genres; an old board draws from all 4, the same mix as before.
            board.genres = [...GENRES];
            board.formatVersion = 2;
          }),
      );
    this.version(3)
      .stores({ boards: 'id', boardIndex: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('boards')
          .toCollection()
          .modify((board: Record<string, unknown>) => {
            // Version 2 had 1 list for the whole board; each deck gets a copy.
            const list = Array.isArray(board.genres) ? (board.genres as Genre[]) : GENRES;
            board.genres = everyDeck(list);
            board.formatVersion = 3;
          }),
      );
    this.version(4)
      .stores({ boards: 'id', boardIndex: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('boards')
          .toCollection()
          .modify((board: Record<string, unknown>) => {
            // Version 3 notes had a fixed "Premise" label; it becomes each note's title.
            if (Array.isArray(board.notes)) {
              board.notes = board.notes.map((note: object) => ({ ...note, title: 'Premise' }));
            }
            board.formatVersion = 4;
          }),
      );
    this.version(5)
      .stores({ boards: 'id', boardIndex: 'id, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('boards')
          .toCollection()
          .modify((board: Record<string, unknown>) => {
            board.formatVersion = 5;
          }),
      );
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
