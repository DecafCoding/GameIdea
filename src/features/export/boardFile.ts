/**
 * The board file (board-file-format in docs/architecture.html): the BoardRecord with its
 * formatVersion as JSON, downloaded as <board-name>.gameidea.json. The save-failed banner and
 * the Export menu both use it; import reads it back through importBoard.ts.
 */
import type { BoardRecord } from '@/shared/model';
import { downloadFile, safeFileBase } from './download';

/** "<name>.gameidea.json", with characters Windows does not allow in a file name replaced. */
export function boardFileName(name: string): string {
  return `${safeFileBase(name)}.gameidea.json`;
}

/** The board file contents. */
export function boardFileJson(board: BoardRecord): string {
  return JSON.stringify(board, null, 2);
}

/** Downloads the board file at once, with no dialog. */
export function downloadBoardFile(board: BoardRecord): void {
  downloadFile(boardFileName(board.name), boardFileJson(board), 'application/json');
}
