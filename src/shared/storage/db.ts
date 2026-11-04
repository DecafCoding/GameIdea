/**
 * The Dexie database "gameidea" (schema-shape in docs/architecture.html): the boards table
 * holds each full BoardRecord by id, and boardIndex holds the list rows by id with an
 * updatedAt index. Only indexed fields are declared; the record is stored whole.
 * Schema version 2 (schema-versions) keeps the same tables and indexes and upgrades each
 * saved board record from format 1 to 2 with upgradeBoardV1, the step UPGRADES[1] runs on
 * board files. A later shape change adds this.version(3) with its upgrade here plus
 * UPGRADES[2] in export/upgrade.ts. After version 2 runs, an older build cannot open the
 * database.
 * Nothing opens the database at module load, so importing this module never needs IndexedDB.
 */
import { Dexie, type EntityTable } from 'dexie';
import { upgradeBoardV1, type BoardIndexRow, type BoardRecord } from '@/shared/model';

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
          .modify((record: Record<string, unknown>, ref) => {
            // A version 1 record has no kind or inConcept; the step adds them. Dexie types
            // ref.value as the record type, which the old record is not, so it is cast.
            ref.value = upgradeBoardV1(record) as never;
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
