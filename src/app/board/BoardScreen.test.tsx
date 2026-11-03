/**
 * Tests for the board screen shell: its controls, the board name field, the save mark, undo
 * and redo, and the banners.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newBoard, useBoardStore, useSaveStatus } from '@/shared/store';
import {
  BoardScreen,
  CHANGED_ELSEWHERE_TEXT,
  POOLS_FAILED_TEXT,
  SAVE_FAILED_TEXT,
} from './BoardScreen';

const POOL_DIR = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'pools');
/** Every fixture pool file, by its deck name. */
const POOL_FILES: Record<string, string> = Object.fromEntries(
  readdirSync(POOL_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => [file.replace(/\.json$/, ''), readFileSync(join(POOL_DIR, file), 'utf8')]),
);
const POOL_TYPES = Object.keys(POOL_FILES);

function servePools(failing: boolean) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    if (failing) return Promise.reject(new TypeError('Failed to fetch'));
    const url = input instanceof Request ? input.url : input.toString();
    const type = POOL_TYPES.find((t) => url.endsWith(`pools/${t}.json`));
    return Promise.resolve(
      type ? new Response(POOL_FILES[type]) : new Response('', { status: 404 }),
    );
  });
}

/** The pool deck buttons (every "Draw A" button but the Hook Card, which needs no pool). */
const decks = () =>
  screen
    .getAllByRole('button', { name: /^Draw A / })
    .filter((button) => button.getAttribute('aria-label') !== 'Draw A Hook Card');

beforeEach(() => {
  useBoardStore.getState().openBoard(newBoard());
  useSaveStatus.getState().setStatus('saved');
  // React Flow measures its container; jsdom has no ResizeObserver.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BoardScreen', () => {
  it('boardScreen_render_showsShellControls', async () => {
    servePools(false);
    render(<BoardScreen />);
    expect(screen.getByRole('link', { name: 'Board List' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Board Name' })).toHaveProperty(
      'value',
      'Untitled Board',
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Add Note' })).toBeTruthy();
    // 9 rail deck buttons (5 core, 3 Modifier, Setting) plus the empty board panel's button.
    await waitFor(() =>
      expect(decks().every((d) => !(d as HTMLButtonElement).disabled)).toBe(true),
    );
    expect(decks()).toHaveLength(10);
  });

  it('boardScreen_renameBlank_keepsOldName', () => {
    servePools(false);
    render(<BoardScreen />);
    const field = screen.getByRole('textbox', { name: 'Board Name' });
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.blur(field);
    expect(useBoardStore.getState().board.name).toBe('Untitled Board');
    expect(field).toHaveProperty('value', 'Untitled Board');

    fireEvent.change(field, { target: { value: 'Drift' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(useBoardStore.getState().board.name).toBe('Drift');
  });

  it('boardScreen_topBar_hasExportButton', () => {
    servePools(false);
    render(<BoardScreen />);
    expect(screen.getByRole('button', { name: 'Export' }).getAttribute('aria-haspopup')).toBe(
      'menu',
    );
  });

  it('boardScreen_poolsFail_showsBannerAndDisablesDecks', async () => {
    servePools(true);
    render(<BoardScreen />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(POOLS_FAILED_TEXT));
    expect(decks().every((d) => (d as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('boardScreen_hookButton_enabledWhenPoolsFail', async () => {
    servePools(true);
    render(<BoardScreen />);
    await screen.findByRole('alert');
    const hook = screen.getByRole('button', { name: 'Draw A Hook Card' });
    expect((hook as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(hook);
    expect(useBoardStore.getState().board.cards.map((c) => c.type)).toEqual(['hook']);
  });
});

describe('save mark and undo', () => {
  const saveMark = () => screen.getByTestId('save-mark');

  it('topBar_saveStatus_showsMarkLabel', () => {
    servePools(false);
    render(<BoardScreen />);
    const labels = { saved: 'Saved', saving: 'Saving', failed: 'Save Failed' } as const;
    for (const status of ['saving', 'failed', 'saved'] as const) {
      act(() => useSaveStatus.getState().setStatus(status));
      expect(saveMark().textContent).toBe(labels[status]);
      expect(saveMark().getAttribute('data-state')).toBe(status);
    }
    expect(saveMark().getAttribute('aria-live')).toBe('polite');
  });

  it('topBar_undoAfterChange_enabledAndUndoes', () => {
    servePools(false);
    render(<BoardScreen />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    act(() => useBoardStore.getState().changeBoard((b) => ({ ...b, name: 'Drift' })));
    expect(undo).toHaveProperty('disabled', false);
    fireEvent.click(undo);
    expect(useBoardStore.getState().board.name).toBe('Untitled Board');
    expect(undo).toHaveProperty('disabled', true);
    expect(redo).toHaveProperty('disabled', false);
    fireEvent.click(redo);
    expect(useBoardStore.getState().board.name).toBe('Drift');
  });

  it('undoKeys_ctrlZ_undoes', () => {
    servePools(false);
    render(<BoardScreen />);
    act(() => useBoardStore.getState().changeBoard((b) => ({ ...b, name: 'Drift' })));
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(useBoardStore.getState().board.name).toBe('Untitled Board');
    fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(useBoardStore.getState().board.name).toBe('Drift');
  });

  it('undoKeys_inTextField_ignored', () => {
    servePools(false);
    render(<BoardScreen />);
    act(() => useBoardStore.getState().changeBoard((b) => ({ ...b, name: 'Drift' })));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Board Name' }), {
      key: 'z',
      ctrlKey: true,
    });
    expect(useBoardStore.getState().board.name).toBe('Drift');
  });
});

describe('banners', () => {
  it('boardScreen_saveFailed_showsBannerAndExports', () => {
    servePools(false);
    const create = vi.fn(() => 'blob:board');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const downloads: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    useSaveStatus.getState().setStatus('failed');
    render(<BoardScreen />);
    expect(screen.getByRole('alert').textContent).toContain(SAVE_FAILED_TEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Export Board File' }));
    expect(downloads).toEqual(['Untitled Board.gameidea.json']);
    click.mockRestore();
  });

  it('boardScreen_saveRecovers_hidesBanner', () => {
    servePools(false);
    useSaveStatus.getState().setStatus('failed');
    render(<BoardScreen />);
    expect(screen.queryByText(SAVE_FAILED_TEXT)).not.toBeNull();
    act(() => useSaveStatus.getState().setStatus('saved'));
    expect(screen.queryByText(SAVE_FAILED_TEXT)).toBeNull();
  });

  it('boardScreen_changedElsewhere_showsStatusBannerAndDismisses', () => {
    servePools(false);
    const dismiss = vi.fn();
    const { rerender } = render(
      <BoardScreen changedElsewhere onDismissChangedElsewhere={dismiss} />,
    );
    expect(screen.getByText(CHANGED_ELSEWHERE_TEXT)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    rerender(<BoardScreen changedElsewhere={false} onDismissChangedElsewhere={dismiss} />);
    expect(screen.queryByText(CHANGED_ELSEWHERE_TEXT)).toBeNull();
  });
});
