/**
 * Tests for the board file name, contents and download.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FORMAT_VERSION } from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boardFileJson, boardFileName, downloadBoardFile } from './boardFile';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('boardFile', () => {
  it('boardFileName_plainName_addsForgeJson', () => {
    expect(boardFileName('Salvage Run')).toBe('Salvage Run.forge.json');
  });

  it('boardFileName_badCharacters_replaced', () => {
    expect(boardFileName('a/b\\c:d*e?f"g<h>i|j\u0001k')).toBe('a-b-c-d-e-f-g-h-i-j-k.forge.json');
  });

  it('boardFileName_blank_untitled', () => {
    expect(boardFileName('   ')).toBe('Untitled Board.forge.json');
  });

  it('boardFileJson_board_roundTripsWithFormatVersion', () => {
    const board = fixtureBoard([fixtureCard('character')]);
    const parsed: unknown = JSON.parse(boardFileJson(board));
    expect(parsed).toEqual(board);
    expect((parsed as { formatVersion: number }).formatVersion).toBe(FORMAT_VERSION);
  });

  it('downloadBoardFile_board_clicksDownloadLink', () => {
    const create = vi.fn(() => 'blob:board');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('Fixture Board.forge.json');
      expect(this.href).toBe('blob:board');
    });
    downloadBoardFile(fixtureBoard([]));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:board');
    vi.unstubAllGlobals();
  });
});
