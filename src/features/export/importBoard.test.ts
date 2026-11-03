/**
 * Tests for the import parser (round trip, bad files) and the new-board rule.
 */
import { describe, expect, it } from 'vitest';
import { everyDeck, FORMAT_VERSION, GENRES, type Board } from '@/shared/model';
import { board200, fixtureBoard, fixtureCard, fixtureNote } from '@/test/fixtures/boards';
import { boardFileJson } from './boardFile';
import { importedBoard, MAX_BOARD_FILE_BYTES, parseBoardFile, readBoardFile } from './importBoard';

const options = { id: 'new-id', now: '2026-10-29T12:00:00.000Z' };

describe('parseBoardFile', () => {
  it('parseBoardFile_exportedBoard200_roundTripsExactly', () => {
    expect(parseBoardFile(boardFileJson(board200()))).toEqual(board200());
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

  it('parseBoardFile_version1File_importsWithAllGenresInEveryDeck', () => {
    const rest: Partial<Board> = fixtureBoard([fixtureCard('character')]);
    delete rest.genres;
    const parsed = parseBoardFile(JSON.stringify({ ...rest, formatVersion: 1 }));
    expect(parsed).toEqual({ ...rest, formatVersion: FORMAT_VERSION, genres: everyDeck(GENRES) });
  });

  it('parseBoardFile_version2File_importsWithItsGenresInEveryDeck', () => {
    const board = fixtureBoard([fixtureCard('setting')]);
    const parsed = parseBoardFile(
      JSON.stringify({ ...board, formatVersion: 2, genres: ['space-opera'] }),
    );
    expect(parsed).toEqual({ ...board, genres: everyDeck(['space-opera']) });
  });

  it('parseBoardFile_version2FileWithEmptyGenres_returnsNull', () => {
    const board = fixtureBoard([]);
    expect(parseBoardFile(JSON.stringify({ ...board, formatVersion: 2, genres: [] }))).toBeNull();
  });

  it('parseBoardFile_cyberpunkCharacterBoard_keepsGenres', () => {
    const genres = { ...everyDeck(GENRES), character: ['cyberpunk' as const] };
    const board = { ...fixtureBoard([]), genres };
    expect(parseBoardFile(boardFileJson(board))?.genres).toEqual(genres);
  });

  it('parseBoardFile_badCard_null', () => {
    const card = { ...fixtureCard('motivation'), rings: [] };
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
