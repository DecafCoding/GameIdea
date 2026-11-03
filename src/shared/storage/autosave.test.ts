/**
 * Tests for the autosave watcher with a mocked storage seam.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newBoard, useBoardStore, useSaveStatus } from '@/shared/store';
import { startAutosave, whenSaved } from './autosave';
import { saveBoard } from './boardStorage';

vi.mock('./boardStorage', () => ({ saveBoard: vi.fn(() => Promise.resolve()) }));

const save = vi.mocked(saveBoard);
let stop: () => void;

const rename = (name: string) => useBoardStore.getState().changeBoard((b) => ({ ...b, name }));

beforeEach(() => {
  useBoardStore.getState().openBoard(newBoard({ id: 'b1' }));
  useSaveStatus.getState().setStatus('saved');
  save.mockReset();
  save.mockResolvedValue(undefined);
  stop = startAutosave();
});

afterEach(async () => {
  await whenSaved();
  stop();
});

describe('autosave', () => {
  it('changeBoard_oneChange_savesOnce', async () => {
    rename('Drift');
    await whenSaved();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0].name).toBe('Drift');
    expect(useSaveStatus.getState().status).toBe('saved');
  });

  it('openBoard_noSave', async () => {
    useBoardStore.getState().openBoard(newBoard({ id: 'b2' }));
    await whenSaved();
    expect(save).not.toHaveBeenCalled();
  });

  it('openBoard_saveOption_saves', async () => {
    useBoardStore.getState().openBoard(newBoard({ id: 'b2' }), { save: true });
    await whenSaved();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0].id).toBe('b2');
  });

  it('changeBoard_duringSave_coalescesToOneMoreSave', async () => {
    let release: () => void = () => undefined;
    save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    rename('One');
    expect(useSaveStatus.getState().status).toBe('saving');
    rename('Two');
    rename('Three');
    rename('Four');
    release();
    await whenSaved();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]![0].name).toBe('Four');
  });

  it('saveBoard_rejects_statusFailed', async () => {
    save.mockRejectedValueOnce(new Error('quota'));
    rename('Drift');
    await whenSaved();
    expect(useSaveStatus.getState().status).toBe('failed');
  });

  it('saveBoard_succeedsAfterFailure_statusSaved', async () => {
    save.mockRejectedValueOnce(new Error('quota'));
    rename('Drift');
    await whenSaved();
    rename('Drift 2');
    await whenSaved();
    expect(useSaveStatus.getState().status).toBe('saved');
  });

  it('whenSaved_pendingSave_resolvesAfterIt', async () => {
    let done = false;
    save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            done = true;
            resolve();
          }, 20),
        ),
    );
    rename('Drift');
    await whenSaved();
    expect(done).toBe(true);
  });

  it('setView_saves', async () => {
    useBoardStore.getState().setView({ panX: 5, panY: 5, zoom: 1 });
    await whenSaved();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
