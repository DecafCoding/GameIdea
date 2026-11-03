/**
 * Board file import (import-policy in docs/architecture.html): read the text, JSON.parse,
 * run the format upgrade steps, then the Zod check of the current format. Any failure is
 * one "bad file" result (null) and nothing is written. A good file always becomes a new
 * board with a new id; a taken name gets " (imported)". The caller saves it.
 */
import type { Board } from '@/shared/model';
import { boardSchema } from './schema';
import { upgradeBoardFile } from './upgrade';

/** A 200-card board is about 50 KB; a larger file than this is refused before reading. */
export const MAX_BOARD_FILE_BYTES = 5 * 1024 * 1024;

export const IMPORTED_TEXT = 'Board imported.';
export const IMPORTED_RENAMED_TEXT =
  'Board imported. The name was taken, so "(imported)" was added.';
export const BAD_IMPORT_TEXT = 'This file is not a TheForge board file. Nothing changed.';

/** The board in a board file's text, or null when the file is not a good board file. */
export function parseBoardFile(text: string): Board | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const upgraded = upgradeBoardFile(json);
  if (!upgraded) return null;
  const result = boardSchema.safeParse(upgraded);
  return result.success ? result.data : null;
}

/** Reads a chosen file. Null when it is too large, unreadable or not a good board file. */
export async function readBoardFile(file: Blob): Promise<Board | null> {
  if (file.size > MAX_BOARD_FILE_BYTES) return null;
  try {
    return parseBoardFile(await file.text());
  } catch {
    return null;
  }
}

/**
 * The board to save for an import: a new id, " (imported)" once when the name is taken,
 * updatedAt now (so it lists first). createdAt, view, cards and notes are kept exactly.
 */
export function importedBoard(
  board: Board,
  takenNames: readonly string[],
  options: { id: string; now: string },
): { board: Board; renamed: boolean } {
  const renamed = takenNames.includes(board.name);
  return {
    board: {
      ...board,
      id: options.id,
      name: renamed ? `${board.name} (imported)` : board.name,
      updatedAt: options.now,
    },
    renamed,
  };
}
