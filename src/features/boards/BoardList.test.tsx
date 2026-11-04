/**
 * Tests for the board list: board cards (meta line, first hook, deck dots), the "No Boards
 * Yet" box, the name-only New Board dialog (Make Board, Cancel and focus return), the More
 * menu (rename in place, export the board file, delete) and import on fake-indexeddb.
 */
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BAD_IMPORT_TEXT,
  boardFileJson,
  IMPORTED_RENAMED_TEXT,
  IMPORTED_TEXT,
} from '@/features/export';
import { allGenresOn } from '@/shared/model';
import { listBoards, loadBoard, saveBoard } from '@/shared/storage';
import { resetDbForTests } from '@/shared/storage/db';
import { fixtureBoard, fixtureCard, fixtureNote, onePagerBoard } from '@/test/fixtures/boards';
import { BoardList, IMPORT_NOTICE_MS } from './BoardList';
import { NO_HOOK_CARD_TEXT } from './BoardCard';

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

async function seedThree() {
  await saveBoard({
    ...fixtureBoard([fixtureCard('role')], [fixtureNote()]),
    id: 'a',
    name: 'Salvage Run',
    updatedAt: minutesAgo(5),
  });
  await saveBoard({
    ...fixtureBoard([]),
    id: 'b',
    name: 'Two Captains',
    updatedAt: minutesAgo(1),
  });
  await saveBoard({
    ...fixtureBoard([fixtureCard('setting'), fixtureCard('conflict', { id: 'c2' })]),
    id: 'c',
    name: 'Old Idea',
    updatedAt: minutesAgo(120),
  });
}

function renderList(onOpen = vi.fn()) {
  render(<BoardList boardHref={(id) => `#/board/${id}`} onOpen={onOpen} />);
  return onOpen;
}

const rowNames = () =>
  within(screen.getByRole('list', { name: 'Saved Boards' }))
    .getAllByRole('link')
    .map((link) => link.textContent);

beforeEach(async () => {
  await resetDbForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const fileInput = () => screen.getByTestId('import-file');

/** The header's button: the "No Boards Yet" box repeats Import Board File and New Board. */
const headerButton = (name: string) => screen.getAllByRole('button', { name })[0]!;

/** Opens a board card's More menu and clicks an item. */
async function menuItem(board: string, item: string) {
  fireEvent.click(await screen.findByRole('button', { name: `More For ${board}` }));
  const menu = screen.getByRole('menu', { name: `More For ${board}` });
  fireEvent.click(within(menu).getByRole('menuitem', { name: item }));
}

/** The open New Board dialog. */
const newBoardDialog = () => within(screen.getByRole('dialog'));

/** Chooses a file in the hidden import input. */
function chooseFile(contents: string) {
  fireEvent.change(fileInput(), {
    target: { files: [new File([contents], 'x.gameidea.json', { type: 'application/json' })] },
  });
}

/** Everything in storage: the index rows and each full record. */
async function storedState() {
  const rows = await listBoards();
  return { rows, boards: await Promise.all(rows.map((row) => loadBoard(row.id))) };
}

const importedFile = (name: string) =>
  boardFileJson({
    ...fixtureBoard([fixtureCard('goal')]),
    id: 'file-id',
    name,
    updatedAt: minutesAgo(600),
  });

describe('BoardList', () => {
  it('boardList_threeBoards_newestFirstWithCaptions', async () => {
    await seedThree();
    renderList();
    await waitFor(() => expect(rowNames()).toEqual(['Two Captains', 'Salvage Run', 'Old Idea']));
    expect(screen.getByText('Edited 5 minutes ago · 1 card · no hook yet')).toBeTruthy();
    expect(screen.getByText('Edited 2 hours ago · 2 cards · no hook yet')).toBeTruthy();
    // No Hook Card on a board: the preview says so.
    expect(screen.getAllByText(NO_HOOK_CARD_TEXT)).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Salvage Run' }).getAttribute('href')).toBe(
      '#/board/a',
    );
  });

  it('boardList_newBoard_savesNameWithAllGenresAndOpens', async () => {
    const onOpen = renderList();
    fireEvent.click(headerButton('New Board'));
    fireEvent.change(newBoardDialog().getByRole('textbox', { name: 'Name' }), {
      target: { value: '  Two Captains  ' },
    });
    fireEvent.click(newBoardDialog().getByRole('button', { name: 'Make Board' }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const board = await loadBoard(onOpen.mock.calls[0]![0] as string);
    expect(board?.name).toBe('Two Captains');
    expect(board?.genres).toEqual(allGenresOn());
  });

  it('boardList_newBoardCancel_savesNothing', async () => {
    const onOpen = renderList();
    fireEvent.click(headerButton('New Board'));
    fireEvent.click(newBoardDialog().getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(headerButton('New Board'));
    expect(await listBoards()).toEqual([]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('boardList_rename_savesNewName', async () => {
    await seedThree();
    renderList();
    await menuItem('Old Idea', 'Rename');
    const field = screen.getByRole('textbox', { name: 'Board Name' });
    fireEvent.change(field, { target: { value: '  New Idea  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() => expect(rowNames()[0]).toBe('New Idea'));
    expect((await loadBoard('c'))?.name).toBe('New Idea');
  });

  it('boardList_renameEmpty_keepsOldName', async () => {
    await seedThree();
    renderList();
    await menuItem('Old Idea', 'Rename');
    fireEvent.change(screen.getByRole('textbox', { name: 'Board Name' }), {
      target: { value: '   ' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Board Name' }), { key: 'Enter' });
    expect(await screen.findByRole('link', { name: 'Old Idea' })).toBeTruthy();
    expect((await loadBoard('c'))?.name).toBe('Old Idea');
  });

  it('boardList_renameEsc_keepsOldName', async () => {
    await seedThree();
    renderList();
    await menuItem('Old Idea', 'Rename');
    const field = screen.getByRole('textbox', { name: 'Board Name' });
    fireEvent.change(field, { target: { value: 'Other' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(await screen.findByRole('link', { name: 'Old Idea' })).toBeTruthy();
    expect((await loadBoard('c'))?.name).toBe('Old Idea');
  });

  it('boardList_deleteConfirm_removesBoard', async () => {
    await seedThree();
    renderList();
    await menuItem('Salvage Run', 'Delete');
    const dialog = screen.getByRole('dialog', { name: 'Delete "Salvage Run"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Board' }));
    await waitFor(() => expect(rowNames()).toEqual(['Two Captains', 'Old Idea']));
    expect(await listBoards()).toHaveLength(2);
    expect(await loadBoard('a')).toBeNull();
  });

  it('boardList_renameClickOutside_saves', async () => {
    await seedThree();
    renderList();
    await menuItem('Old Idea', 'Rename');
    expect(screen.getByText('Enter saves. Esc cancels.')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Board Name' }), {
      target: { value: 'Clicked Away' },
    });
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(rowNames()[0]).toBe('Clicked Away'));
    expect((await loadBoard('c'))?.name).toBe('Clicked Away');
  });

  it('boardList_card_showsFirstHookMetaAndDots', async () => {
    await saveBoard({
      ...fixtureBoard([
        fixtureCard('hook'),
        fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
        fixtureCard('goal', { z: 3, tuckedUnder: 'role-1' }),
      ]),
      id: 'h',
      name: 'Lighthouse',
      updatedAt: minutesAgo(10),
    });
    renderList();
    const card = (await screen.findByRole('link', { name: 'Lighthouse' })).closest('li')!;
    expect(within(card).getByText('Edited 10 minutes ago · 3 cards · 1 hook')).toBeTruthy();
    expect(within(card).getByTestId('hook-preview').textContent).toBe(
      'You are a navigator to keep the light on.',
    );
    const dots = [...card.querySelectorAll('[data-type]')].map((d) => d.getAttribute('data-type'));
    expect(dots).toEqual(['hook', 'role', 'goal']);
  });

  it('boardList_onePager_showsLabel', async () => {
    await saveBoard({ ...onePagerBoard(), updatedAt: minutesAgo(3) });
    renderList();
    const card = (await screen.findByRole('link', { name: 'One Pager' })).closest('li')!;
    const label = within(card).getByTestId('board-kind-label');
    expect(label.textContent).toBe('One-Pager');
    expect(label.getAttribute('data-board-kind')).toBe('onePager');
  });

  it('boardList_freeForm_noLabel', async () => {
    await seedThree();
    renderList();
    await screen.findByRole('link', { name: 'Salvage Run' });
    expect(screen.queryByTestId('board-kind-label')).toBeNull();
  });

  it('boardList_emptyHookCardOnly_noPreviewBox', async () => {
    await saveBoard({ ...fixtureBoard([fixtureCard('hook')]), id: 'e', name: 'Empty Hook' });
    renderList();
    const card = (await screen.findByRole('link', { name: 'Empty Hook' })).closest('li')!;
    expect(within(card).queryByTestId('hook-preview')).toBeNull();
  });

  it('boardList_noBoards_showsNoBoardsYet', async () => {
    renderList();
    const box = await screen.findByRole('region', { name: 'No Boards Yet' });
    expect(box.textContent).toContain(
      'Make a board to start drawing cards. Or import a board file from another computer.',
    );
    expect(within(box).getByRole('button', { name: 'New Board' })).toBeTruthy();
    expect(within(box).getByRole('button', { name: 'Import Board File' })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Saved Boards' })).toBeNull();
  });

  it('boardList_menu_escapeClosesAndReturnsFocus', async () => {
    await seedThree();
    renderList();
    const more = await screen.findByRole('button', { name: 'More For Old Idea' });
    fireEvent.click(more);
    const menu = screen.getByRole('menu', { name: 'More For Old Idea' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Rename', 'Export Board File', 'Delete']);
    expect(document.activeElement?.textContent).toBe('Rename');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Export Board File');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  it('boardList_deleteCancel_keepsBoard', async () => {
    await seedThree();
    renderList();
    await menuItem('Salvage Run', 'Delete');
    const dialog = screen.getByRole('dialog', { name: 'Delete "Salvage Run"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await listBoards()).toHaveLength(3);
  });
});

describe('BoardList import', () => {
  it('boardList_importGoodFile_newRowOnTopHighlightedWithMessage', async () => {
    await seedThree();
    renderList();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    chooseFile(importedFile('Drift'));
    expect(await screen.findByText(IMPORTED_TEXT)).toBeTruthy();
    expect(rowNames()).toEqual(['Drift', 'Two Captains', 'Salvage Run', 'Old Idea']);
    const row = screen.getByRole('link', { name: 'Drift' }).closest('li')!;
    expect(row.hasAttribute('data-highlighted')).toBe(true);
    expect(within(row).getByText('Imported just now · 1 card · no hook yet')).toBeTruthy();
    const saved = await listBoards();
    expect(saved[0]!.id).not.toBe('file-id');
    expect(await loadBoard('file-id')).toBeNull();
  });

  it('boardList_importTakenName_addsImportedAndSaysSo', async () => {
    await seedThree();
    renderList();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    chooseFile(importedFile('Salvage Run'));
    expect(await screen.findByText(IMPORTED_RENAMED_TEXT)).toBeTruthy();
    expect(rowNames()[0]).toBe('Salvage Run (imported)');
  });

  it('boardList_importBadFile_showsBannerAndChangesNothing', async () => {
    await seedThree();
    renderList();
    await waitFor(() => expect(rowNames()).toHaveLength(3));
    const before = await storedState();
    chooseFile('not a board');
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain(BAD_IMPORT_TEXT);
    expect(banner.querySelector('[data-icon="file-x"]')).toBeTruthy();
    expect(await storedState()).toEqual(before);
    expect(rowNames()).toHaveLength(3);
  });

  it('boardList_chooseAnotherFile_opensFileInput', async () => {
    renderList();
    const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => undefined);
    fireEvent.click(headerButton('Import Board File'));
    expect(click).toHaveBeenCalledTimes(1);
    chooseFile('[]');
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Another File' }));
    expect(click).toHaveBeenCalledTimes(2);
    chooseFile(importedFile('Drift'));
    expect(await screen.findByText(IMPORTED_TEXT)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('boardList_importNotice_clearsAfterTimeout', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    renderList();
    chooseFile(importedFile('Drift'));
    expect(await screen.findByText(IMPORTED_TEXT)).toBeTruthy();
    vi.advanceTimersByTime(IMPORT_NOTICE_MS);
    await waitFor(() => expect(screen.queryByText(IMPORTED_TEXT)).toBeNull());
    const row = screen.getByRole('link', { name: 'Drift' }).closest('li')!;
    expect(row.hasAttribute('data-highlighted')).toBe(false);
  });
});
