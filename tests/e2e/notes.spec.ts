/**
 * Browser tests for premise notes on the canvas (design 9.6): add, edit, end editing,
 * resize, delete, drag, the count badge, and keys while typing.
 */
import { expect, test, type Page } from '@playwright/test';
import { fixtureBoard, fixtureCard, fixtureNote } from '@/test/fixtures/boards';
import { boxOf, cardById, dragBy, openBoard, rail } from './board-helpers';
import { backgroundRgb, expectRgbNear } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const field = (page: Page) => page.getByRole('textbox', { name: 'Note Text' });
const note = (page: Page) => page.getByTestId('note');

async function addNote(page: Page) {
  await rail(page).getByRole('button', { name: 'Add Note' }).click();
  await expect(field(page)).toBeFocused();
}

async function clickPane(page: Page) {
  const canvas = await boxOf(page.getByTestId('canvas'));
  await page.mouse.click(canvas.x + 40, canvas.y + canvas.height - 120);
}

test('notes_addNote_opensInEditMode', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await expect(note(page)).toHaveCount(1);
  await expect(note(page).getByRole('textbox', { name: 'Note Title' })).toHaveValue('Note');
  await expect(note(page)).toHaveCSS('outline-width', '2px');
  await expect(page.getByRole('heading', { name: 'Start With One Card' })).toHaveCount(0);
  const box = await boxOf(note(page));
  expect(box.width).toBe(310);
  expect(box.height).toBe(160);
});

test('notes_typeThenEsc_keepsText', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await page.keyboard.type('A ship adrift');
  await page.keyboard.press('Enter');
  await page.keyboard.type('with no crew');
  await page.keyboard.press('Escape');
  await expect(field(page)).toHaveCount(0);
  await expect(note(page).locator('p')).toHaveText('A ship adrift\nwith no crew');
});

test('notes_clickOutside_endsEditing', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await page.keyboard.type('The last colony');
  await clickPane(page);
  await expect(field(page)).toHaveCount(0);
  await expect(note(page)).toContainText('The last colony');

  // A click on the note opens it again with the text.
  await note(page).getByText('The last colony').click();
  await expect(field(page)).toHaveValue('The last colony');
});

test('notes_editTitle_keepsTitleAfterClickOutside', async ({ page }) => {
  await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Body' })]));
  await note(page).getByText('Note', { exact: true }).click();
  const title = note(page).getByRole('textbox', { name: 'Note Title' });
  await expect(title).toBeFocused();
  await title.fill('Logline');
  // Moving from the title to the text keeps editing.
  await page.keyboard.press('Enter');
  await expect(field(page)).toBeFocused();
  await clickPane(page);
  await expect(field(page)).toHaveCount(0);
  await expect(note(page).getByText('Logline', { exact: true })).toBeVisible();
});

test('notes_bodyWhiteHeaderPaper', async ({ page }) => {
  await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Body' })]));
  expectRgbNear(await backgroundRgb(note(page)), [255, 255, 255]);
  const header = note(page).locator('[data-note-title]').locator('..');
  expectRgbNear(await backgroundRgb(header), [0xfb, 0xf6, 0xe4]);
});

test('notes_resizeHandle_changesSizeWithinBounds', async ({ page }) => {
  await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Resize me' })]));
  await note(page).click();
  const handle = page.getByRole('button', { name: 'Resize Note' });
  await dragBy(page, handle, 100, 100, { x: 34, y: 34 });
  await expect.poll(async () => (await boxOf(note(page))).width).toBe(320);
  expect((await boxOf(note(page))).height).toBe(260);

  await dragBy(page, handle, -200, -300, { x: 34, y: 34 });
  await expect.poll(async () => (await boxOf(note(page))).width).toBe(300);
  expect((await boxOf(note(page))).height).toBe(120);
});

test('notes_trash_deletesNote', async ({ page }) => {
  await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Bin me' })]));
  await note(page).click();
  await page.getByRole('button', { name: 'Delete Note' }).click();
  await expect(note(page)).toHaveCount(0);
  await expect(page.getByTestId('count-badge')).toHaveText('0 cards · 0 notes');
});

test('notes_drag_moves', async ({ page }) => {
  await openBoard(page, fixtureBoard([], [fixtureNote({ x: 96, y: 96, text: 'Move me' })]));
  const before = await boxOf(note(page));
  await dragBy(page, note(page), 150, 80, { x: 40, y: 12 });
  await expect.poll(async () => (await boxOf(note(page))).x - before.x).toBeCloseTo(150, 0);
  expect((await boxOf(note(page))).y - before.y).toBeCloseTo(80, 0);
  await expect(field(page)).toHaveCount(0);
});

test('notes_count_badgeCountsNotes', async ({ page }) => {
  await openBoard(page, fixtureBoard([fixtureCard('character', { x: 480, y: 96 })]));
  await addNote(page);
  await page.keyboard.press('Escape');
  await addNote(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('count-badge')).toHaveText('1 card · 2 notes');
  const [a, b] = await note(page).all();
  const boxA = await boxOf(a!);
  const boxB = await boxOf(b!);
  expect(
    boxA.x + boxA.width <= boxB.x ||
      boxB.x + boxB.width <= boxA.x ||
      boxA.y + boxA.height <= boxB.y ||
      boxB.y + boxB.height <= boxA.y,
  ).toBe(true);
});

test('notes_typingKeys_doNotTurnOrDiscardSelectedCard', async ({ page }) => {
  await openBoard(
    page,
    fixtureBoard([fixtureCard('character', { x: 480, y: 96 })], [fixtureNote({ x: 96, y: 96 })]),
  );
  await cardById(page, 'character-1').click({ position: { x: 30, y: 30 } });
  await note(page).click();
  await page.keyboard.type('rr');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Delete');
  await expect(field(page)).toHaveValue('r');
  await expect(cardById(page, 'character-1')).toHaveCount(1);
  await expect(cardById(page, 'character-1').getByTestId('active-cue')).toHaveText('navigator');
});
