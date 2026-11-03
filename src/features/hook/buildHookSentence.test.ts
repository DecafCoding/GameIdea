/**
 * Tests for the hook sentence builder: every rule in docs/mvp-plan.html (Hook sentence
 * rules), the design 9.5 failure case, and its purity.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Deck } from '@/shared/model';
import { buildHookSentence, type StackEntry } from './buildHookSentence';

const e = (type: Deck, connector: string | null, activeText: string): StackEntry => ({
  type,
  connector,
  activeText,
});

const CORE: StackEntry[] = [
  e('role', 'You are a', 'lighthouse keeper'),
  e('mechanic', 'who must', 'trade'),
  e('resource', 'using', 'memories'),
  e('goal', 'to', 'keep the light on'),
  e('conflict', 'but', 'the tide rises every night'),
];

describe('buildHookSentence', () => {
  it('buildHookSentence_fullCoreStack_readsPrdExample', () => {
    expect(buildHookSentence(CORE)).toBe(
      'You are a lighthouse keeper who must trade using memories to keep the light on, but the tide rises every night.',
    );
  });

  it('buildHookSentence_topCardNotRole_startsWithCapitalBadge', () => {
    expect(
      buildHookSentence([
        e('mechanic', 'who must', 'build'),
        e('conflict', 'but', 'fuel runs out at sunset'),
      ]),
    ).toBe('Who must build, but fuel runs out at sunset.');
  });

  it('buildHookSentence_missingDecks_noBlankSlot', () => {
    const sentence = buildHookSentence([
      e('role', 'You are a', 'pilot'),
      e('mechanic', 'who must', '   '),
      e('goal', 'to', 'reach home'),
    ]);
    expect(sentence).toBe('You are a pilot to reach home.');
    expect(sentence).not.toMatch(/ {2}|\s,/);
  });

  it.each([
    ['mood', 'It feels', 'tense', 'You are a pilot. It feels tense.'],
    ['twist', 'The catch:', 'your guide lies', 'You are a pilot. The catch: your guide lies.'],
    ['twist', 'Except', 'the map is alive', 'You are a pilot. Except the map is alive.'],
    [
      'progression',
      'As you play,',
      'new islands open',
      'You are a pilot. As you play, new islands open.',
    ],
  ] as const)('buildHookSentence_%s_startsNewSentence (%s)', (type, word, text, expected) => {
    expect(buildHookSentence([e('role', 'You are a', 'pilot'), e(type, word, text)])).toBe(
      expected,
    );
  });

  it('buildHookSentence_mood_startsNewSentence', () => {
    expect(buildHookSentence([...CORE, e('mood', 'It feels', 'eerie')])).toMatch(
      /night\. It feels eerie\.$/,
    );
  });

  it('buildHookSentence_twistCatch_newSentenceKeepsColon', () => {
    expect(buildHookSentence([...CORE, e('twist', 'The catch:', 'the keeper is a ghost')])).toMatch(
      /night\. The catch: the keeper is a ghost\.$/,
    );
  });

  it('buildHookSentence_progression_newSentenceWithComma', () => {
    expect(
      buildHookSentence([...CORE, e('progression', 'Over time,', 'the town rebuilds')]),
    ).toMatch(/night\. Over time, the town rebuilds\.$/);
  });

  it('buildHookSentence_constraint_appendsWith', () => {
    expect(
      buildHookSentence([e('role', 'You are a', 'pilot'), e('constraint', 'with', 'no jumping')]),
    ).toBe('You are a pilot with no jumping.');
  });

  it('buildHookSentence_looseModifier_isLeftOut', () => {
    expect(
      buildHookSentence([
        e('role', 'You are a', 'pilot'),
        e('modifier', null, 'frozen'),
        e('goal', 'to', 'fly'),
      ]),
    ).toBe('You are a pilot to fly.');
  });

  it('buildHookSentence_sameDeckAnd_readsAnd', () => {
    expect(
      buildHookSentence([
        e('role', 'You are a', 'pilot'),
        e('goal', 'to', 'fly'),
        e('goal', 'and', 'land'),
      ]),
    ).toBe('You are a pilot to fly and land.');
  });

  it('buildHookSentence_empty_returnsEmpty', () => {
    expect(buildHookSentence([])).toBe('');
    expect(buildHookSentence([e('modifier', null, 'frozen')])).toBe('');
  });

  it('buildHookSentence_endsWithQuestion_noExtraPeriod', () => {
    expect(buildHookSentence([e('role', 'You are a', 'pilot'), e('goal', 'to', 'ask why?')])).toBe(
      'You are a pilot to ask why?',
    );
  });

  it('buildHookSentence_combinedText_tallFrozenPilot', () => {
    expect(buildHookSentence([e('role', 'You are a', 'tall frozen pilot')])).toBe(
      'You are a tall frozen pilot.',
    );
  });

  it('buildHookSentence_conflictWithoutConnector_noComma', () => {
    expect(
      buildHookSentence([e('role', 'You are a', 'pilot'), e('conflict', null, 'storms')]),
    ).toBe('You are a pilot storms.');
  });

  it('buildHookSentence_purity_noReactImport', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'features', 'hook', 'buildHookSentence.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/from '(react|@xyflow)/);
    expect(source).not.toMatch(/from '@\/shared\/(storage|store)/);
  });
});
