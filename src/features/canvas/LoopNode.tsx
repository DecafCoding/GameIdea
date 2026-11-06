/**
 * LoopNode: the Core Loop card as a React Flow node (design 9.16,
 * docs/feature-core-loop-card.html). The card comes from the store with a per-id selector;
 * the 4 step texts come from 4 string selectors on loopSteps, so the node re-renders only
 * when a step's words change. The live text is built here with buildLoopText and passed to
 * the loop feature's view, which never imports the canvas. An edit commits on blur through
 * setLoopText and Reset From Cards through resetLoopText, each 1 changeBoard (1 undo step,
 * 1 save). The hover menu shows in a NodeToolbar with the shared one-open-menu rule. The
 * node is never selected and the R key never reaches it. A click highlights it; then its
 * left or right edge resizes it (ResizeEdges, user 2026-11-05), saved once on release
 * through resizePanel.
 */
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { memo, useMemo, useState, type CSSProperties } from 'react';
import { buildLoopText, LoopCard, LoopMenu, type LoopSteps } from '@/features/loop';
import { useBoardStore } from '@/shared/store';
import { resetLoopText, setLoopText } from './boardActions';
import type { LoopFlowNode } from './nodes';
import { PANEL_RANGE, resizePanel, type EdgeResult } from './panelResize';
import { cardSize } from './placement';
import { loopSteps } from './reading';
import { ResizeEdges } from './ResizeEdges';
import { usePanelClick } from './usePanelClick';
import edgeStyles from './ResizeEdges.module.css';
import { STRIP_GAP, useHoverMenu } from './useHoverMenu';
import styles from './LoopNode.module.css';

function LoopNodeView({ data }: NodeProps<LoopFlowNode>) {
  const id = data.cardId;
  const card = useBoardStore((state) => state.board.cards.find((c) => c.id === id));
  const mechanic = useBoardStore((state) => loopSteps(state.board).mechanic);
  const resource = useBoardStore((state) => loopSteps(state.board).resource);
  const progression = useBoardStore((state) => loopSteps(state.board).progression);
  const goal = useBoardStore((state) => loopSteps(state.board).goal);
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const { hover, cardRef, menuRef, enter, leave } = useHoverMenu();
  const [live, setLive] = useState<EdgeResult | null>(null);
  const click = usePanelClick('loop');

  const liveText = useMemo(() => {
    const steps: LoopSteps = {};
    if (mechanic !== undefined) steps.mechanic = mechanic;
    if (resource !== undefined) steps.resource = resource;
    if (progression !== undefined) steps.progression = progression;
    if (goal !== undefined) steps.goal = goal;
    return buildLoopText(steps);
  }, [mechanic, resource, progression, goal]);

  if (!card) return null;
  const shown = card.loopText ?? liveText.text;
  const saved = cardSize(card).width;
  const style = {
    '--panel-w': `${live?.width ?? saved}px`,
    transform: live?.shift ? `translateX(${live.shift}px)` : undefined,
  } as CSSProperties;

  return (
    <div
      ref={cardRef}
      className={`${styles.node} ${data.highlighted ? edgeStyles.highlight : ''}`}
      style={style}
      data-highlighted={data.highlighted ? '' : undefined}
      onPointerDown={click.onPointerDown}
      onPointerEnter={enter}
      onPointerMove={enter}
      onPointerLeave={(event) => leave(event.nativeEvent)}
    >
      <LoopCard
        liveText={liveText.text}
        loopText={card.loopText}
        onCommit={(text) => changeBoard((board) => setLoopText(board, id, text))}
        interactiveClassName="nodrag nowheel nopan"
        width={live?.width ?? saved}
      />
      {data.highlighted && (
        <ResizeEdges
          label="Core Loop"
          width={saved}
          range={PANEL_RANGE.loop}
          onLive={setLive}
          onCommit={(edge, dx) => changeBoard((board) => resizePanel(board, 'loop', edge, dx))}
        />
      )}
      <NodeToolbar isVisible position={Position.Top} offset={0}>
        <div
          ref={menuRef}
          style={{ paddingBottom: STRIP_GAP, pointerEvents: hover ? undefined : 'none' }}
          onPointerEnter={enter}
          onPointerLeave={(event) => leave(event.nativeEvent)}
        >
          <LoopMenu
            text={shown}
            hasLoopText={card.loopText !== undefined}
            visible={hover}
            onReset={() => changeBoard((board) => resetLoopText(board, id))}
          />
        </div>
      </NodeToolbar>
    </div>
  );
}

export const LoopNode = memo(LoopNodeView);
