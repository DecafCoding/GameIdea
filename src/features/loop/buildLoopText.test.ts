/** Tests for the Core Loop live text builder: order, lead words and missing steps. */
import { describe, expect, it } from 'vitest';
import { buildLoopText, type LoopSteps } from './buildLoopText';

const ALL: LoopSteps = {
  mechanic: 'summon',
  resource: 'clues',
  progression: 'hub grows',
  goal: 'finish a week of chores',
};

describe('buildLoopText', () => {
  it('buildLoopText_allFourSteps_joinsWithArrowsAndLeads', () => {
    const { parts, text } = buildLoopText(ALL);
    expect(text).toBe('summon → earn clues → hub grows → to finish a week of chores');
    expect(parts).toEqual([
      { deck: 'mechanic', lead: '', text: 'summon' },
      { deck: 'resource', lead: 'earn', text: 'clues' },
      { deck: 'progression', lead: '', text: 'hub grows' },
      { deck: 'goal', lead: 'to', text: 'finish a week of chores' },
    ]);
  });

  it('buildLoopText_eachSingleMissingStep_leftOut', () => {
    const cases: [keyof LoopSteps, string][] = [
      ['mechanic', 'earn clues → hub grows → to finish a week of chores'],
      ['resource', 'summon → hub grows → to finish a week of chores'],
      ['progression', 'summon → earn clues → to finish a week of chores'],
      ['goal', 'summon → earn clues → hub grows'],
    ];
    for (const [missing, expected] of cases) {
      const steps = { ...ALL };
      delete steps[missing];
      const { parts, text } = buildLoopText(steps);
      expect(text).toBe(expected);
      expect(parts.map((p) => p.deck)).not.toContain(missing);
      expect(text).not.toMatch(/→ →|^ ?→|→ ?$/);
    }
  });

  it('buildLoopText_onlyGoal_leadKept', () => {
    expect(buildLoopText({ goal: 'escape the city' }).text).toBe('to escape the city');
  });

  it('buildLoopText_noSteps_emptyPartsAndText', () => {
    expect(buildLoopText({})).toEqual({ parts: [], text: '' });
  });

  it('buildLoopText_doesNotMutateInput', () => {
    const steps = { ...ALL };
    const copy = JSON.parse(JSON.stringify(steps)) as LoopSteps;
    buildLoopText(steps);
    expect(steps).toEqual(copy);
  });
});
