/**
 * Tests for the safe file base name and the shared download link.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, safeFileBase } from './download';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('download', () => {
  it('safeFileBase_badCharacters_replaced', () => {
    expect(safeFileBase(' a/b\\c:d*e?f"g<h>i|j\u0001k ')).toBe('a-b-c-d-e-f-g-h-i-j-k');
  });

  it('safeFileBase_blank_untitled', () => {
    expect(safeFileBase('   ')).toBe('Untitled Board');
  });

  it('downloadFile_text_clicksLinkWithNameAndRevokesUrl', () => {
    const create = vi.fn(() => 'blob:text');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('Salvage Run.txt');
      expect(this.href).toBe('blob:text');
    });
    downloadFile('Salvage Run.txt', 'Salvage Run\n', 'text/plain;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:text');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
