/**
 * QuestionsNode: the Questions panel as a React Flow node (design 9.17,
 * docs/feature-questions-panel.html). The answers come from the store; the deck state
 * (current question, seen list, draft) and the question pool's load state come from
 * QuestionsUiContext, which BoardCanvas provides, because onlyRenderVisibleElements
 * unmounts an off-screen node and would lose them. Save Answer, an answer edit (on blur)
 * and a delete are each 1 changeBoard (1 undo step, 1 save); Next Question is view state
 * only. The view comes from the questions feature, which never imports the canvas.
 * A click highlights the panel; then its left or right edge resizes it (ResizeEdges, user
 * 2026-11-05): the width shows live and saves once, on release, through resizePanel.
 */
import type { NodeProps } from '@xyflow/react';
import { createContext, memo, useContext, useState, type CSSProperties } from 'react';
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
import { PANEL_RANGE, resizePanel, type EdgeResult } from './panelResize';
import { ResizeEdges } from './ResizeEdges';
import { usePanelClick } from './usePanelClick';
import edgeStyles from './ResizeEdges.module.css';
import styles from './QuestionsNode.module.css';

/** What BoardCanvas hands the panel node: the deck view state and the pool's load state. */
export interface QuestionsUi {
  deck: QuestionDeck;
  status: QuestionPoolState['status'];
  retry: () => void;
}

export const QuestionsUiContext = createContext<QuestionsUi | null>(null);

const NO_ANSWERS: readonly Answer[] = [];

function QuestionsNodeView({ data }: NodeProps<QuestionsFlowNode>) {
  const [live, setLive] = useState<EdgeResult | null>(null);
  const click = usePanelClick('questions');
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

  const width = live?.width ?? data.width;
  const style = {
    '--panel-w': `${width}px`,
    transform: live?.shift ? `translateX(${live.shift}px)` : undefined,
  } as CSSProperties;

  return (
    <div
      className={`${styles.node} ${data.highlighted ? edgeStyles.highlight : ''}`}
      style={style}
      data-highlighted={data.highlighted ? '' : undefined}
      onPointerDown={click.onPointerDown}
    >
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
      {data.highlighted && (
        <ResizeEdges
          label="Questions"
          width={data.width}
          range={PANEL_RANGE.questions}
          onLive={setLive}
          onCommit={(edge, dx) => changeBoard((board) => resizePanel(board, 'questions', edge, dx))}
        />
      )}
    </div>
  );
}

export const QuestionsNode = memo(QuestionsNodeView);
