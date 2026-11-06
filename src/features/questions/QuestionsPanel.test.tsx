/**
 * Tests for the Questions panel view: its states, no count in the header, the disabled Save Answer,
 * the single commit on blur, Esc and delete.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Answer } from '@/shared/model';
import { QUESTIONS_DONE_TEXT, QUESTIONS_FAILED_TEXT, QuestionsPanel } from './QuestionsPanel';

const ANSWERS: Answer[] = [
  { id: 'answer-2', question: 'What makes it fun?', answer: 'Chasing the light.' },
  { id: 'answer-1', question: 'Who is the player?', answer: 'A night owl.' },
];

function renderPanel(props: Partial<Parameters<typeof QuestionsPanel>[0]> = {}) {
  const calls = {
    onDraftChange: vi.fn(),
    onNext: vi.fn(),
    onSave: vi.fn(),
    onRetry: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  const view = render(
    <QuestionsPanel
      status="ready"
      question="What could go wrong?"
      allAnswered={false}
      draft=""
      answers={[]}
      {...calls}
      {...props}
    />,
  );
  return { ...view, ...calls };
}

const listFields = () =>
  within(screen.getByTestId('answer-list')).getAllByRole<HTMLTextAreaElement>('textbox', {
    name: 'Answer',
  });

describe('QuestionsPanel', () => {
  it('questionsPanel_ready_showsQuestionFieldAndButtons', () => {
    const { container } = renderPanel({ interactiveClassName: 'nodrag' });
    expect(screen.getByRole('region', { name: 'Questions' })).toBeTruthy();
    expect(
      container.querySelector('header [data-icon="message-circle-question-mark"]'),
    ).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Questions' })).toBeTruthy();
    expect(screen.getByTestId('current-question').textContent).toBe('What could go wrong?');
    const field = screen.getByTestId('answer-field');
    expect(field.getAttribute('aria-label')).toBe('Answer');
    expect(field.className).toContain('nodrag');
    expect(screen.getByRole('button', { name: 'Next Question' }).className).toContain('nodrag');
    expect(screen.getByRole('button', { name: 'Save Answer' })).toBeTruthy();
  });

  it('questionsPanel_emptyDraft_saveDisabled', () => {
    renderPanel({ draft: '   ' });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save Answer' }).disabled).toBe(
      true,
    );
  });

  it('questionsPanel_save_callsOnSave', () => {
    const { onSave, onNext, onDraftChange } = renderPanel({ draft: 'Too dark.' });
    fireEvent.change(screen.getByTestId('answer-field'), { target: { value: 'Too dark!' } });
    expect(onDraftChange).toHaveBeenCalledWith('Too dark!');
    fireEvent.click(screen.getByRole('button', { name: 'Save Answer' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next Question' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('questionsPanel_answers_listNewestFirstNoCount', () => {
    const { rerender } = renderPanel({ answers: ANSWERS.slice(1) });
    expect(screen.queryByTestId('questions-count')).toBeNull();
    rerender(
      <QuestionsPanel
        status="ready"
        question="What could go wrong?"
        allAnswered={false}
        draft=""
        answers={ANSWERS}
        onDraftChange={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('questions-count')).toBeNull();
    expect(screen.getByRole('banner').textContent).toBe('Questions');
    const items = screen.getAllByTestId('answer-item');
    expect(items.map((item) => item.dataset.answerId)).toEqual(['answer-2', 'answer-1']);
    expect(items[0]!.textContent).toContain('What makes it fun?');
    expect(listFields().map((field) => field.value)).toEqual([
      'Chasing the light.',
      'A night owl.',
    ]);
  });

  it('questionsPanel_noAnswers_noPillNoDivider', () => {
    const { container } = renderPanel();
    expect(screen.queryByTestId('questions-count')).toBeNull();
    expect(screen.queryByTestId('answer-list')).toBeNull();
    expect(container.querySelector('hr')).toBeNull();
  });

  it('questionsPanel_editBlur_callsOnEditOnce', () => {
    const { onEdit } = renderPanel({ answers: ANSWERS });
    const field = listFields()[1]!;
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'An early bird.' } });
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('answer-1', 'An early bird.');
  });

  it('questionsPanel_escape_blursAndCommits', () => {
    const { onEdit } = renderPanel({ answers: ANSWERS });
    const field = listFields()[0]!;
    field.focus();
    fireEvent.change(field, { target: { value: 'Running.' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(document.activeElement).not.toBe(field);
    expect(onEdit).toHaveBeenCalledWith('answer-2', 'Running.');
  });

  it('questionsPanel_delete_callsOnDelete', () => {
    const { onDelete } = renderPanel({ answers: ANSWERS });
    const buttons = screen.getAllByRole('button', { name: 'Delete Answer' });
    fireEvent.click(buttons[1]!);
    expect(onDelete).toHaveBeenCalledWith('answer-1');
  });

  it('questionsPanel_allAnswered_showsMessageHidesField', () => {
    renderPanel({ allAnswered: true, question: null, answers: ANSWERS });
    expect(screen.getByText(QUESTIONS_DONE_TEXT)).toBeTruthy();
    expect(screen.queryByTestId('answer-field')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next Question' })).toBeNull();
    expect(screen.getAllByTestId('answer-item')).toHaveLength(2);
  });

  it('questionsPanel_failed_showsErrorRetryAndList', () => {
    const { onRetry } = renderPanel({ status: 'failed', question: null, answers: ANSWERS });
    expect(screen.getByText(QUESTIONS_FAILED_TEXT)).toBeTruthy();
    expect(screen.queryByTestId('answer-field')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('answer-item')).toHaveLength(2);
  });

  it('questionsPanel_loading_noTopPart', () => {
    renderPanel({ status: 'loading', question: null });
    expect(screen.queryByTestId('current-question')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
