/**
 * QuestionsPanel: the Questions panel view (design 9.17, docs/feature-questions-panel.html
 * Panel). A header with the question icon, "Questions" and an "N Answered" pill; the top
 * part (the current question, the answer field, Next Question and Save Answer, or the
 * all-answered message, or the load-failed message with Retry); then the answer list,
 * newest first, each answer editable in place (a local draft that commits once on blur,
 * Esc blurs) with a trash button. No React Flow and no store here: the canvas passes the
 * deck state, the answers and the callbacks in, and its no-drag class names through
 * interactiveClassName.
 */
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Answer } from '@/shared/model';
import { Button, Icon } from '@/shared/ui';
import styles from './QuestionsPanel.module.css';

/** The all-answered message (design 9.17). */
export const QUESTIONS_DONE_TEXT =
  'You answered every question. Delete an answer to see its question again.';

/** The load-failed message (design 9.17). */
export const QUESTIONS_FAILED_TEXT = 'The questions did not load. Your saved answers still work.';

/** The count pill text: "1 Answered", "3 Answered". */
export function answeredCountText(count: number): string {
  return `${count} Answered`;
}

interface QuestionsPanelProps {
  status: 'loading' | 'ready' | 'failed';
  question: string | null;
  allAnswered: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onNext: () => void;
  onSave: () => void;
  onRetry: () => void;
  answers: readonly Answer[];
  /** Called once on blur with the field's text. */
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  /** The canvas passes "nodrag nowheel nopan". */
  interactiveClassName?: string;
}

/** A text area that grows with its text (CSS field-sizing is not in every target engine). */
function useAutoGrow(value: string) {
  const field = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return field;
}

/** Esc blurs the field, which commits it. */
function blurOnEscape(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.blur();
  }
}

function AnswerItem({
  item,
  onEdit,
  onDelete,
  interactive,
}: {
  item: Answer;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  interactive: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? item.answer;
  const field = useAutoGrow(value);
  return (
    <li className={styles.item} data-testid="answer-item" data-answer-id={item.id}>
      <p className={styles.itemQuestion}>{item.question}</p>
      <textarea
        ref={field}
        className={`${styles.itemField} ${interactive}`}
        aria-label="Answer"
        rows={1}
        value={value}
        onFocus={() => setDraft(item.answer)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={blurOnEscape}
        onBlur={() => {
          const text = draft ?? value;
          setDraft(null);
          onEdit(item.id, text);
        }}
      />
      <button
        type="button"
        className={`${styles.trash} ${interactive}`}
        aria-label="Delete Answer"
        onClick={() => onDelete(item.id)}
      >
        <Icon name="trash" size={16} />
      </button>
    </li>
  );
}

export function QuestionsPanel({
  status,
  question,
  allAnswered,
  draft,
  onDraftChange,
  onNext,
  onSave,
  onRetry,
  answers,
  onEdit,
  onDelete,
  interactiveClassName = '',
}: QuestionsPanelProps) {
  const field = useAutoGrow(draft);
  const interactive = interactiveClassName;

  function top() {
    if (status === 'failed') {
      return (
        <div className={styles.top}>
          <p className={styles.failed} role="alert">
            {QUESTIONS_FAILED_TEXT}
          </p>
          <Button variant="secondary" className={interactive} onClick={onRetry}>
            Retry
          </Button>
        </div>
      );
    }
    if (allAnswered) return <p className={styles.done}>{QUESTIONS_DONE_TEXT}</p>;
    if (status === 'loading' || question === null) return null;
    return (
      <div className={styles.top}>
        <p className={styles.question} data-testid="current-question">
          {question}
        </p>
        <textarea
          ref={field}
          className={`${styles.field} ${interactive}`}
          aria-label="Answer"
          data-testid="answer-field"
          rows={3}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <div className={styles.buttons}>
          <Button variant="secondary" className={interactive} onClick={onNext}>
            Next Question
          </Button>
          <Button
            variant="primary"
            className={interactive}
            disabled={draft.trim() === ''}
            onClick={onSave}
          >
            Save Answer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={styles.panel}
      role="region"
      aria-label="Questions"
      data-testid="questions-panel"
    >
      <header className={styles.header}>
        <span className={styles.icon}>
          <Icon name="message-circle-question-mark" size={13} />
        </span>
        <h2 className={styles.title}>Questions</h2>
        {answers.length > 0 && (
          <span className={styles.pill} data-testid="questions-count">
            {answeredCountText(answers.length)}
          </span>
        )}
      </header>
      {top()}
      {answers.length > 0 && (
        <>
          <hr className={styles.divider} />
          <ol className={styles.list} data-testid="answer-list">
            {answers.map((item) => (
              <AnswerItem
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                interactive={interactive}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
