/**
 * Browser tests for the optional decks (design 8.2 and 9.6; Phase 4) on the fixture pools:
 * Mood, Twist, Progression and Constraint draw from the rail with their face, icon and cue
 * count, show their badges inside a Hook Card stack and split the hook into sentences, and
 * a rail-drawn Mood tucked into a stack reads as a new sentence and undoes in one step.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import type { Board, Card } from '@/shared/model';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { boxOf, canvasCards, cardById, dragTo, drawFromRail, openBoard } from './board-helpers';
import type { DeckName } from './helpers';

const sentence = (page: Page) => page.getByTestId('hook-sentence');
const badgeOf = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`).getByTestId('connector-badge');

/** A Hook Card with a Player Role, a Mechanic and a Goal tucked in order, then any extras. */
function hookBoard(extra: Card[] = [], zoom = 1): Board {
  return {
    ...fixtureBoard([
      fixtureCard('hook', { x: 96, y: 144 }),
      fixtureCard('role', { x: 116, y: 200, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('mechanic', { x: 116, y: 256, z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { x: 116, y: 312, z: 4, tuckedUnder: 'mechanic-1' }),
      ...extra,
    ]),
    id: 'hook-board',
    name: 'Hook Board',
    view: { panX: 0, panY: 0, zoom },
  };
}

const HOOK_TEXT = 'You are a navigator who must trade to keep the light on.';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('optional_drawFromRail_showsFaceIconAndCueCount', async ({ page }) => {
  await openBoard(page, { ...fixtureBoard([]), id: 'empty-board' });
  const decks: [DeckName, string, string, number][] = [
    ['Mood', 'mood', 'smile', 4],
    ['Twist', 'twist', 'rotate-ccw', 2],
    ['Progression', 'progression', 'trending-up', 2],
    ['Constraint', 'constraint', 'shield-x', 2],
  ];
  for (const [deck, type, icon, count] of decks) {
    await drawFromRail(page, deck);
    const card = page.locator(`.react-flow__node [data-card][data-type="${type}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.locator('[data-edge]')).toHaveCount(count);
    await expect(card.getByTestId('type-disc').locator(`[data-icon="${icon}"]`)).toHaveCount(1);
    await expect(card.getByTestId('middle-rule')).toHaveCount(count === 2 ? 1 : 0);
    const cues = await card.locator('[data-edge]').allTextContents();
    expect(new Set(cues.map((c) => c.toLowerCase())).size).toBe(count);
    // Undo the draw so the next card lands alone.
    await page.keyboard.press('Control+z');
    await expect(canvasCards(page)).toHaveCount(0);
  }
});

test('optional_tuckedIntoHookStack_badgesAndSentences', async ({ page }) => {
  await openBoard(
    page,
    hookBoard(
      [
        fixtureCard('constraint', { x: 116, y: 368, z: 5, tuckedUnder: 'goal-1' }),
        fixtureCard('mood', { x: 116, y: 424, z: 6, tuckedUnder: 'constraint-1' }),
        fixtureCard('twist', { x: 116, y: 480, z: 7, tuckedUnder: 'mood-1' }),
        fixtureCard('progression', { x: 116, y: 536, z: 8, tuckedUnder: 'twist-1' }),
      ],
      0.6,
    ),
  );
  // The upper card's node renders the badge for the card tucked under it.
  await expect(badgeOf(page, 'goal-1')).toHaveText('with');
  await expect(badgeOf(page, 'constraint-1')).toHaveText('It feels');
  await expect(badgeOf(page, 'mood-1')).toHaveText('Except');
  await expect(badgeOf(page, 'twist-1')).toHaveText('As you play,');
  await expect(sentence(page)).toHaveText(
    'You are a navigator who must trade to keep the light on with no jumping. It feels tense. Except the map is alive. As you play, new islands open.',
  );
});

test('optional_drawMoodAndTuck_newSentenceAndOneUndo', async ({ page }) => {
  await openBoard(page, hookBoard());
  await expect(sentence(page)).toHaveText(HOOK_TEXT);
  await drawFromRail(page, 'Mood');
  const mood = page.locator('.react-flow__node [data-card][data-type="mood"]');
  await expect(mood).toHaveCount(1);
  const cue = (await mood.getByTestId('active-cue').textContent())!;
  // Optional cards get no slot hint: the pointer must land inside the target card.
  const goal = await boxOf(cardById(page, 'goal-1'));
  await dragTo(page, mood, { x: goal.x + goal.width / 2, y: goal.y + goal.height * 0.75 });
  await expect(sentence(page)).toHaveText(
    /^You are a navigator who must trade to keep the light on\. It feels .+\.$/,
  );
  await expect(sentence(page)).toContainText(cue);
  await page.keyboard.press('Control+z');
  await expect(sentence(page)).toHaveText(HOOK_TEXT);
  await expect(mood).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(mood).toHaveCount(0);
});
