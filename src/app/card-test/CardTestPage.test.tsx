/**
 * Tests for the card test page: deck buttons, draw, combine, the pools banner and R.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardTestPage } from './CardTestPage';

const POOL_DIR = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'pools');
/** Every fixture pool file, by its deck name. */
const POOL_FILES: Record<string, string> = Object.fromEntries(
  readdirSync(POOL_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => [file.replace(/\.json$/, ''), readFileSync(join(POOL_DIR, file), 'utf8')]),
);
const POOL_TYPES = Object.keys(POOL_FILES);

let failing = false;

function servePools() {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    if (failing) return Promise.reject(new TypeError('Failed to fetch'));
    const url = input instanceof Request ? input.url : input.toString();
    const type = POOL_TYPES.find((t) => url.endsWith(`pools/${t}.json`));
    return Promise.resolve(
      type ? new Response(POOL_FILES[type]) : new Response('', { status: 404 }),
    );
  });
}

const deckButtons = () => screen.getAllByRole('button', { name: /^Draw A / });
const cards = () => screen.queryAllByTestId('card');
const draw = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

async function renderReady() {
  render(<CardTestPage />);
  await waitFor(() => expect(deckButtons()[0]).toHaveProperty('disabled', false));
}

describe('CardTestPage', () => {
  beforeEach(() => {
    failing = false;
    servePools();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CardTestPage_poolsReady_showsFiveEnabledDeckButtons', async () => {
    await renderReady();
    expect(deckButtons().map((b) => b.textContent)).toEqual([
      'Draw A Player Role',
      'Draw A Goal',
      'Draw A Conflict',
      'Draw A Modifier',
      'Draw A Setting',
    ]);
    for (const button of deckButtons()) expect(button).toHaveProperty('disabled', false);
  });

  it('CardTestPage_drawRole_addsRoleCard', async () => {
    await renderReady();
    draw('Draw A Player Role');
    expect(cards()).toHaveLength(1);
    expect(cards()[0]!.getAttribute('data-type')).toBe('role');
  });

  it('CardTestPage_combineWithRoleAndModifier_leavesOneCombinedCard', async () => {
    await renderReady();
    draw('Draw A Player Role');
    draw('Draw A Modifier');
    expect(cards()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Combine' }));
    expect(cards()).toHaveLength(1);
    expect(cards()[0]!.getAttribute('data-combined')).toBe('true');
    expect(screen.getByTestId('active-cue').textContent).toMatch(/^\S+ .+$/);
  });

  it('CardTestPage_noModifier_combineDisabled', async () => {
    await renderReady();
    draw('Draw A Player Role');
    expect(screen.getByRole('button', { name: 'Combine' })).toHaveProperty('disabled', true);
  });

  it('CardTestPage_poolsFail_showsBannerAndDisablesDecks', async () => {
    failing = true;
    render(<CardTestPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'The decks did not load. Saved cards still work. Drawing is off until the decks load.',
    );
    for (const button of deckButtons()) expect(button).toHaveProperty('disabled', true);
  });

  it('CardTestPage_retryAfterFailure_hidesBannerAndEnablesDecks', async () => {
    failing = true;
    render(<CardTestPage />);
    await screen.findByRole('alert');
    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    await waitFor(() => expect(deckButtons()[0]).toHaveProperty('disabled', false));
  });

  it('CardTestPage_rKeyOverHoveredCard_turnsItsRing', async () => {
    await renderReady();
    draw('Draw A Player Role');
    const card = cards()[0]!;
    const before = screen.getByTestId('active-cue').textContent;
    const right = card.querySelector('[data-edge="3"]')!.textContent;
    fireEvent.pointerEnter(card.parentElement!);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', cancelable: true }));
    });
    const after = screen.getByTestId('active-cue').textContent;
    expect(after).toBe(right);
    expect(after).not.toBe(before);
  });
});
