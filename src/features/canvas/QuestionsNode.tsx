/**
 * QuestionsNode: the Questions panel as a React Flow node (design 9.17,
 * docs/feature-questions-panel.html). The answers come from the store; the deck state
 * (current question, seen list, draft) and the question pool's load state come from
 * QuestionsUiContext, which BoardCanvas provides, because onlyRenderVisibleElements
 * unmounts an off-screen node and would lose them. Save Answer, an answer edit (on blur)
 * and a delete are each 1 changeBoard (1 undo step, 1 save); Next Question is view state
 * only. The view comes from the questions feature, which never imports the canvas.
 */
import type { NodeProps } from '@xyflow/react';
import { createContext, memo, useContext } from 'react';
import {
  addAnswer,
  deleteAnswer,
  editAnswer,
  QuestionsPanel,
  type QuestionDeck,
} from '@/features/questions';
import { newId, type Answer } from '@/shared/model';
import type { QuestionPoolState } from '@/shared/pools';
import { useBoardStore } from '@/shared/store';
import type { QuestionsFlowNode } from './nodes';

/** What BoardCanvas hands the panel node: the deck view state and the pool's load state. */
export interface QuestionsUi {
  deck: QuestionDeck;
  status: QuestionPoolState['status'];
  retry: () => void;
}

export const QuestionsUiContext = createContext<QuestionsUi | null>(null);

const NO_ANSWERS: readonly Answer[] = [];

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the panel needs no node data
function QuestionsNodeView(_props: NodeProps<QuestionsFlowNode>) {
  const answers = useBoardStore((state) => state.board.questions) ?? NO_ANSWERS;
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const ui = useContext(QuestionsUiContext);
  if (!ui) return null;
  const { deck, status, retry } = ui;

  function onSave() {
    const question = deck.current;
    const text = deck.draft;
    if (question === null || text.trim() === '') return;
    changeBoard((board) => addAnswer(board, newId(), question, text));
    deck.saved();
  }

  return (
    <QuestionsPanel
      status={status}
      question={deck.current}
      allAnswered={deck.allAnswered}
      draft={deck.draft}
      onDraftChange={deck.setDraft}
      onNext={deck.next}
      onSave={onSave}
      onRetry={retry}
      answers={answers}
      onEdit={(id, text) => changeBoard((board) => editAnswer(board, id, text))}
      onDelete={(id) => changeBoard((board) => deleteAnswer(board, id))}
      interactiveClassName="nodrag nowheel nopan"
    />
  );
}

export const QuestionsNode = memo(QuestionsNodeView);
