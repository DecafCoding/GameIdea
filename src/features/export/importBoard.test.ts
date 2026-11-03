/**
 * Tests for the import parser (round trip, bad files) and the new-board rule.
 */
import { describe, expect, it } from 'vitest';
import { allGenresOn, FORMAT_VERSION } from '@/shared/model';
import {
  board200,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  roundTripBoard,
} from '@/test/fixtures/boards';
import { boardFileJson } from './boardFile';
import { importedBoard, MAX_BOARD_FILE_BYTES, parseBoardFile, readBoardFile } from './importBoard';

const options = { id: 'new-id', now: '2026-10-29T12:00:00.000Z' };

describe('parseBoardFile', () => {
  it('parseBoardFile_exportedBoard200_roundTripsExactly', () => {
    expect(parseBoardFile(boardFileJson(board200()))).toEqual(board200());
  });

  it('parseBoardFile_exportedRoundTripBoard_deepEqualsOriginal', () => {
    expect(parseBoardFile(boardFileJson(roundTripBoard()))).toEqual(roundTripBoard());
  });

  it('parseBoardFile_notJson_null', () => {
    expect(parseBoardFile('not a board')).toBeNull();
    expect(parseBoardFile('')).toBeNull();
  });

  it('parseBoardFile_jsonArray_null', () => {
    expect(parseBoardFile('[]')).toBeNull();
  });

  it('parseBoardFile_newerFormat_null', () => {
    expect(
      parseBoardFile(JSON.stringify({ ...fixtureBoard([]), formatVersion: FORMAT_VERSION + 1 })),
    ).toBeNull();
  });

  it('parseBoardFile_horrorMechanicBoard_keepsGenres', () => {
    const genres = { ...allGenresOn(), mechanic: ['horror' as const] };
    const board = { ...fixtureBoard([]), genres };
    expect(parseBoardFile(boardFileJson(board))?.genres).toEqual(genres);
  });

  it('parseBoardFile_badCard_null', () => {
    const card = { ...fixtureCard('goal'), rings: [] };
    expect(parseBoardFile(JSON.stringify(fixtureBoard([card])))).toBeNull();
  });
});

describe('readBoardFile', () => {
  it('readBoardFile_tooLarge_null', async () => {
    const big = new Blob([new Uint8Array(MAX_BOARD_FILE_BYTES + 1)]);
    expect(await readBoardFile(big)).toBeNull();
  });

  it('readBoardFile_goodFile_board', async () => {
    const board = fixtureBoard([fixtureCard('setting')]);
    expect(await readBoardFile(new Blob([boardFileJson(board)]))).toEqual(board);
  });
});

describe('importedBoard', () => {
  const board = { ...fixtureBoard([]), name: 'Salvage Run' };

  it('importedBoard_freeName_keepsNameNewIdNow', () => {
    const result = importedBoard(board, ['Drift'], options);
    expect(result.renamed).toBe(false);
    expect(result.board.id).toBe('new-id');
    expect(result.board.name).toBe('Salvage Run');
    expect(result.board.updatedAt).toBe(options.now);
  });

  it('importedBoard_takenName_addsImported', () => {
    const result = importedBoard(board, ['Salvage Run'], options);
    expect(result.renamed).toBe(true);
    expect(result.board.name).toBe('Salvage Run (imported)');
  });

  it('importedBoard_roundTrip_changesOnlyIdNameUpdatedAt', () => {
    const original = roundTripBoard();
    const parsed = parseBoardFile(boardFileJson(original))!;
    const { board: result } = importedBoard(parsed, [original.name], options);
    const strip = (board: typeof original) => ({ ...board, id: '', name: '', updatedAt: '' });
    expect(strip(result)).toEqual(strip(original));
    expect(result.id).toBe('new-id');
    expect(result.name).toBe('Round Trip (imported)');
  });

  it('importedBoard_keepsCardsNotesViewCreatedAt', () => {
    const full = {
      ...fixtureBoard([fixtureCard('conflict')], [fixtureNote({ text: 'Hi.' })]),
      view: { panX: 10, panY: -20, zoom: 1.5 },
    };
    const { board: result } = importedBoard(full, [], options);
    expect(result.cards).toEqual(full.cards);
    expect(result.notes).toEqual(full.notes);
    expect(result.view).toEqual(full.view);
    expect(result.createdAt).toBe(full.createdAt);
  });
});
