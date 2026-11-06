/**
 * Tests for the Core Loop card face: header, no template, the placeholder help text, the edit field's
 * draft and its single commit on blur.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildLoopText } from './buildLoopText';
import { LOOP_EMPTY_TEXT, LoopCard } from './LoopCard';

const LIVE = buildLoopText({
  mechanic: 'summon',
  resource: 'clues',
  progression: 'hub grows',
  goal: 'finish a week of chores',
});

function renderCard(props: Partial<Parameters<typeof LoopCard>[0]> = {}) {
  const onCommit = vi.fn();
  const view = render(<LoopCard liveText={LIVE.text} onCommit={onCommit} {...props} />);
  const field = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Core Loop Text' });
  return { ...view, onCommit, field };
}

describe('LoopCard', () => {
  it('loopCard_header_iconAndLabel', () => {
    const { container } = renderCard();
    expect(container.querySelector('header [data-icon="repeat"]')).not.toBeNull();
    expect(container.querySelector('header')!.textContent).toBe('Core Loop');
    expect(screen.getByRole('article', { name: 'Core Loop' })).toBeTruthy();
  });

  it('loopCard_noTemplate_onlyHeaderAndField', () => {
    const { container } = renderCard();
    expect(screen.queryByTestId('loop-template')).toBeNull();
    expect(container.querySelector('hr')).toBeNull();
    expect(container.querySelector('[data-loop-step]')).toBeNull();
  });

  it('loopCard_noText_helpTextIsPlaceholder', () => {
    const { field } = renderCard({ liveText: '' });
    expect(field().value).toBe('');
    expect(field().placeholder).toBe(LOOP_EMPTY_TEXT);
  });

  it('loopCard_field_showsLiveTextWithoutLoopText', () => {
    const { field } = renderCard();
    expect(field().value).toBe(LIVE.text);
  });

  it('loopCard_field_showsLoopTextWhenStored', () => {
    const { field } = renderCard({ loopText: 'my loop' });
    expect(field().value).toBe('my loop');
  });

  it('loopCard_typing_noCommitUntilBlur', () => {
    const { field, onCommit } = renderCard();
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: 'dig' } });
    fireEvent.change(field(), { target: { value: 'dig deeper' } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(field().value).toBe('dig deeper');
  });

  it('loopCard_blur_commitsDraftOnce', () => {
    const { field, onCommit } = renderCard();
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: 'dig deeper' } });
    fireEvent.blur(field());
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('dig deeper');
  });

  it('loopCard_escape_blursAndCommits', () => {
    const { field, onCommit } = renderCard();
    field().focus();
    fireEvent.change(field(), { target: { value: 'dig deeper' } });
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(document.activeElement).not.toBe(field());
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('dig deeper');
  });

  it('loopCard_liveTextChange_updatesUnfocusedField', () => {
    const { field, rerender, onCommit } = renderCard();
    const next = buildLoopText({ mechanic: 'craft', goal: 'escape' });
    rerender(<LoopCard liveText={next.text} onCommit={onCommit} />);
    expect(field().value).toBe('craft → to escape');
  });

  it('loopCard_liveTextChange_keepsDraftWhileFocused', () => {
    const { field, rerender, onCommit } = renderCard();
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: 'my draft' } });
    const next = buildLoopText({ mechanic: 'craft' });
    rerender(<LoopCard liveText={next.text} onCommit={onCommit} />);
    expect(field().value).toBe('my draft');
  });

  it('loopCard_field_ariaLabelCoreLoopText', () => {
    const { field } = renderCard({ interactiveClassName: 'nodrag nowheel' });
    expect(field().getAttribute('aria-label')).toBe('Core Loop Text');
    expect(field().className).toContain('nodrag');
  });
});
