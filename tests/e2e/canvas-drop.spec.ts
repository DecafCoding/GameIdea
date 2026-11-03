/**
 * Browser tests for drag and drop on the canvas (design 9.4 and 9.5), on fixture boards:
 * tuck, paint order, stack moves, untuck, the slot hint, combine, the swap and tuck zones,
 * swap, split and the combine timing. Each drop test runs with snap on and with snap off.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureStack,
  secondModifier,
} from '@/test/fixtures/boards';
import type { Board } from '@/shared/model';
import { boxOf, canvasCards, cardById, dragBy, dragTo, openBoard, typeAt } from './board-helpers';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/** A point inside a card, relative to its top-left, as a page point. */
async function pointOn(page: Page, id: string, dx: number, dy: number) {
  const box = await boxOf(cardById(page, id));
  return { x: box.x + dx, y: box.y + dy };
}

async function emptyPanePoint(page: Page) {
  const canvas = await boxOf(page.getByTestId('canvas'));
  return { x: canvas.x + canvas.width - 260, y: canvas.y + canvas.height - 280 };
}

async function expectBelow(page: Page, id: string, parentId: string) {
  await expect
    .poll(async () => {
      const card = await boxOf(cardById(page, id));
      const parent = await boxOf(cardById(page, parentId));
      return Math.abs(card.y - parent.y - 56) <= 1 && Math.abs(card.x - parent.x) <= 1;
    })
    .toBe(true);
}

const open = (page: Page, board: Board) => openBoard(page, board);

// The drag, tuck, combine, swap and On Top tests run with snap on and with snap off
// (docs/feature-settings-and-theme.html, Regression).
for (const snap of [true, false]) {
  test.describe(`snap ${snap ? 'on' : 'off'}`, () => {
    test.use({ settings: { snap } });

    test.describe('tuck', () => {
      test('tuck_dropGoalOnRole_sits59Below', async ({ page }) => {
        await open(
          page,
          fixtureBoard([
            fixtureCard('role', { x: 96, y: 96 }),
            fixtureCard('goal', { x: 528, y: 96, z: 2 }),
          ]),
        );
        await dragTo(page, cardById(page, 'goal-1'), await pointOn(page, 'role-1', 100, 100));
        await expectBelow(page, 'goal-1', 'role-1');
        await expect(cardById(page, 'goal-1')).toHaveAttribute('data-paper', 'under-1');
      });

      test('tuck_tuckedCard_paintsUnderParent', async ({ page }) => {
        await open(page, fixtureBoard(fixtureStack(96, 96)));
        const ids = ['role-1', 'goal-1', 'conflict-1'];
        const types = ['role', 'goal', 'conflict'];
        for (let i = 1; i < ids.length; i++) {
          const parent = await boxOf(cardById(page, ids[i - 1]!));
          const tucked = await boxOf(cardById(page, ids[i]!));
          expect(await typeAt(page, tucked.x + 100, parent.y + 178)).toBe(types[i - 1]);
          expect(await typeAt(page, tucked.x + 100, tucked.y + 178)).toBe(types[i]);
        }
        await expect(cardById(page, 'conflict-1')).toHaveAttribute('data-paper', 'under-2');
      });

      test('tuck_dragParent_stackMoves', async ({ page }) => {
        await open(page, fixtureBoard(fixtureStack(96, 96)));
        const ids = ['role-1', 'goal-1', 'conflict-1'];
        const before = await Promise.all(ids.map((id) => boxOf(cardById(page, id))));
        await dragBy(page, cardById(page, 'role-1'), 300, 60);
        // With snap on, the root lands on the nearest grid dot (96 + 300 → 408, 96 + 60 → 168).
        const [dx, dy] = snap ? [312, 72] : [300, 60];
        await expect
          .poll(async () => (await boxOf(cardById(page, 'conflict-1'))).x - before[2]!.x)
          .toBeCloseTo(dx, 0);
        const after = await Promise.all(ids.map((id) => boxOf(cardById(page, id))));
        for (let i = 0; i < ids.length; i++) {
          expect(Math.abs(after[i]!.x - before[i]!.x - dx)).toBeLessThanOrEqual(1);
          expect(Math.abs(after[i]!.y - before[i]!.y - dy)).toBeLessThanOrEqual(1);
        }
      });

      test('tuck_dragTuckedCardToPane_untucks', async ({ page }) => {
        await open(page, fixtureBoard(fixtureStack(96, 96)));
        const target = await emptyPanePoint(page);
        await dragTo(page, cardById(page, 'conflict-1'), target, { x: 30, y: 180 });
        // With snap on, the card lands on the grid dot nearest the drop: within half a step.
        await expect
          .poll(
            async () =>
              Math.abs((await boxOf(cardById(page, 'conflict-1'))).x - (target.x - 30)) <=
              (snap ? 12 : 1),
          )
          .toBe(true);
        await expect(cardById(page, 'conflict-1')).toHaveAttribute('data-paper', 'top');
        // The old stack is untouched, and moving it leaves the untucked card behind.
        const conflict = await boxOf(cardById(page, 'conflict-1'));
        await dragBy(page, cardById(page, 'role-1'), 0, 40);
        await expect
          .poll(async () => (await boxOf(cardById(page, 'goal-1'))).y)
          .toBeCloseTo((await boxOf(cardById(page, 'role-1'))).y + 56, 0);
        expect((await boxOf(cardById(page, 'conflict-1'))).y).toBeCloseTo(conflict.y, 0);
      });

      test('tuck_dragGoalNearRole_showsSlotHint', async ({ page }) => {
        await open(
          page,
          fixtureBoard([
            fixtureCard('role', { x: 96, y: 96 }),
            fixtureCard('goal', { x: 528, y: 96, z: 2 }),
          ]),
        );
        // Into the 72 px band under the Player Role's bottom edge.
        const band = await pointOn(page, 'role-1', 100, 230);
        await dragTo(page, cardById(page, 'goal-1'), band, undefined, false);
        const slot = page.getByTestId('hint-slot');
        await expect(slot).toBeVisible();
        await expect(slot).toHaveText('Goal goes here');
        // Design 9.7: 200 × 72, starting 16 above the Player Role's bottom edge.
        const role = await boxOf(cardById(page, 'role-1'));
        const box = await boxOf(slot);
        expect(Math.round(box.width)).toBe(200);
        expect(Math.round(box.height)).toBe(72);
        expect(Math.abs(box.y - (role.y + role.height - 16))).toBeLessThanOrEqual(1);
        await page.mouse.up();
        await expect(slot).toHaveCount(0);
        await expectBelow(page, 'goal-1', 'role-1');
      });

      test('tuck_dropConflictOnSetting_tucksWithoutHint', async ({ page }) => {
        await open(
          page,
          fixtureBoard([
            fixtureCard('setting', { x: 96, y: 96 }),
            fixtureCard('conflict', { x: 528, y: 96, z: 2 }),
          ]),
        );
        await dragTo(
          page,
          cardById(page, 'conflict-1'),
          await pointOn(page, 'setting-1', 100, 100),
          undefined,
          false,
        );
        await expect(page.getByTestId('hint-slot')).toHaveCount(0);
        await page.mouse.up();
        await expectBelow(page, 'conflict-1', 'setting-1');
      });
    });

    test.describe('combine', () => {
      const pair = (type: 'role' | 'setting') =>
        fixtureBoard([
          fixtureCard(type, { x: 96, y: 96 }),
          fixtureCard('modifier', { x: 528, y: 96, z: 2 }),
        ]);

      test('combine_firstDropAnywhere_combinesAndRemovesModifier', async ({ page }) => {
        await open(page, pair('role'));
        await dragTo(page, cardById(page, 'modifier-1'), await pointOn(page, 'role-1', 20, 185));
        await expect(cardById(page, 'modifier-1')).toHaveCount(0);
        const role = cardById(page, 'role-1');
        await expect(role.getByTestId('combined-disc')).toBeVisible();
        await expect(role.getByTestId('active-cue')).toHaveText('exiled navigator');
        await expect(canvasCards(page)).toHaveCount(1);
      });

      test('combine_dragOver_showsDropToCombine', async ({ page }) => {
        await open(page, pair('role'));
        await dragTo(
          page,
          cardById(page, 'modifier-1'),
          await pointOn(page, 'role-1', 100, 60),
          undefined,
          false,
        );
        const hint = page.getByTestId('hint-combine');
        await expect(hint).toBeVisible();
        await expect(hint).toHaveText('Drop to combine');
        await expect(page.getByTestId('hint-slot')).toHaveCount(0);
        await page.mouse.up();
        await expect(hint).toHaveCount(0);
      });

      test('combine_setting_followsRoleRules', async ({ page }) => {
        await open(page, pair('setting'));
        await dragTo(
          page,
          cardById(page, 'modifier-1'),
          await pointOn(page, 'setting-1', 100, 100),
        );
        await expect(cardById(page, 'modifier-1')).toHaveCount(0);
        await expect(cardById(page, 'setting-1').getByTestId('active-cue')).toHaveText(
          'exiled outpost',
        );
      });

      const combinedPair = () =>
        fixtureBoard([
          combinedCard('role', { x: 96, y: 96 }),
          secondModifier({ x: 528, y: 96, z: 2 }),
        ]);

      test('swap_centerDrop_swapsAdjectivesAndPlacesModifierBeside', async ({ page }) => {
        await open(page, combinedPair());
        await dragTo(page, cardById(page, 'modifier-2'), await pointOn(page, 'role-1', 100, 100));
        const role = cardById(page, 'role-1');
        const modifier = cardById(page, 'modifier-2');
        await expect(role.getByTestId('active-cue')).toHaveText('devout navigator');
        await expect(modifier.getByTestId('active-cue')).toHaveText('exiled');
        const a = await boxOf(role);
        const b = await boxOf(modifier);
        const overlap =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        expect(overlap).toBe(false);
        await expect(modifier).toHaveAttribute('data-paper', 'top');
      });

      test('swap_dragOverCombined_showsSwapAndAddOnTopZones', async ({ page }) => {
        await open(page, combinedPair());
        await dragTo(
          page,
          cardById(page, 'modifier-2'),
          await pointOn(page, 'role-1', 100, 100),
          undefined,
          false,
        );
        const zones = page.getByTestId('hint-zones');
        await expect(zones).toBeVisible();
        await expect(zones.getByText('Swap')).toHaveAttribute('data-active', 'true');
        await expect(zones.getByText('Add on top')).toHaveAttribute('data-active', 'false');
        const band = await pointOn(page, 'role-1', 30, 20);
        await page.mouse.move(band.x, band.y, { steps: 4 });
        await expect(zones.getByText('Add on top')).toHaveAttribute('data-active', 'true');
        await page.mouse.up();
      });

      test('onTop_topBandDrop_readsBeforeTheMergedAdjective', async ({ page }) => {
        await open(page, combinedPair());
        await dragTo(page, cardById(page, 'modifier-2'), await pointOn(page, 'role-1', 100, 20));
        // The On Top card has no node of its own; it reads first on every edge of its base.
        await expect(cardById(page, 'modifier-2')).toHaveCount(0);
        await expect(cardById(page, 'role-1').getByTestId('active-cue')).toHaveText(
          'devout exiled navigator',
        );
      });

      test('split_strip_restoresModifierAsItWas', async ({ page }) => {
        const card = combinedCard('role', { x: 96, y: 96 });
        card.rings[1] = { ...card.rings[1]!, activeIndex: 2 };
        await open(
          page,
          fixtureBoard([card, fixtureCard('goal', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' })]),
        );
        await expect(cardById(page, 'role-1').getByTestId('active-cue')).toHaveText(
          'clone navigator',
        );
        await cardById(page, 'role-1').click({ position: { x: 30, y: 30 } });
        await page.getByRole('button', { name: 'Split' }).click();
        const modifier = page.locator('.react-flow__node [data-card][data-type="modifier"]');
        await expect(modifier).toHaveCount(1);
        await expect(modifier.getByTestId('active-cue')).toHaveText('clone');
        await expect(modifier.locator('[data-edge]')).toHaveCount(4);
        await expect(cardById(page, 'role-1').getByTestId('active-cue')).toHaveText('navigator');
        await expectBelow(page, 'goal-1', 'role-1');
      });
    });
  });
}

test.describe('combine timing', () => {
  test('combine_dropAndSwap_under100ms', { tag: '@timing' }, async ({ page }) => {
    await open(
      page,
      fixtureBoard([
        fixtureCard('role', { x: 96, y: 96 }),
        fixtureCard('modifier', { x: 528, y: 96, z: 2 }),
        secondModifier({ x: 528, y: 360, z: 3 }),
      ]),
    );

    /** Time from the pointer release to the change being in the DOM. */
    async function timeDrop(id: string, to: { x: number; y: number }, done: string) {
      await page.evaluate((selector) => {
        const w = window as unknown as { __drop: Promise<number> };
        w.__drop = new Promise((resolve) => {
          let upAt = 0;
          window.addEventListener('pointerup', () => (upAt = performance.now()), {
            capture: true,
            once: true,
          });
          const observer = new MutationObserver(() => {
            if (upAt && document.querySelector(selector)) {
              observer.disconnect();
              resolve(performance.now() - upAt);
            }
          });
          observer.observe(document.body, { subtree: true, childList: true, characterData: true });
        });
      }, done);
      await dragTo(page, cardById(page, id), to);
      return page.evaluate(() => (window as unknown as { __drop: Promise<number> }).__drop);
    }

    const combineMs = await timeDrop(
      'modifier-1',
      await pointOn(page, 'role-1', 100, 100),
      '.react-flow__node[data-id="role-1"] [data-testid="combined-disc"]',
    );
    expect(combineMs).toBeLessThan(100);

    const swapMs = await timeDrop(
      'modifier-2',
      await pointOn(page, 'role-1', 100, 100),
      '.react-flow__node[data-id="modifier-2"] [data-testid="active-cue"]:not(:empty)',
    );
    expect(swapMs).toBeLessThan(100);
    await expect(cardById(page, 'role-1').getByTestId('active-cue')).toHaveText('devout navigator');
  });
});
