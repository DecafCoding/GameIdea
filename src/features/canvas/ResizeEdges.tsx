/**
 * ResizeEdges: the 2 resize edges of a highlighted panel (the Details panel, the Core Loop
 * card or the Questions panel; user 2026-11-05). Each edge is a clear strip on the
 * panel's left or right border with the ew-resize cursor. A press and drag reports the
 * live width (onLive) and saves once, on release (onCommit); the pure rule is edgeResize.
 * The edges show only while the panel is highlighted, so a plain press on the panel still
 * drags it.
 */
import { useReactFlow } from '@xyflow/react';
import { useRef, type PointerEvent } from 'react';
import { edgeResize, type EdgeResult, type PanelEdge, type WidthRange } from './panelResize';
import styles from './ResizeEdges.module.css';

interface ResizeEdgesProps {
  /** The panel name for the edge labels, such as "Details". */
  label: string;
  width: number;
  range: WidthRange;
  /** The live width and left-side move while an edge moves; null when the drag ends. */
  onLive: (live: EdgeResult | null) => void;
  /** The release: the edge and how far it moved, in flow pixels. */
  onCommit: (edge: PanelEdge, dx: number) => void;
}

interface EdgeDrag {
  edge: PanelEdge;
  pointerId: number;
  startX: number;
  zoom: number;
}

export function ResizeEdges({ label, width, range, onLive, onCommit }: ResizeEdgesProps) {
  const flow = useReactFlow();
  const drag = useRef<EdgeDrag | null>(null);

  const dxOf = (event: PointerEvent<HTMLElement>) =>
    (event.clientX - drag.current!.startX) / drag.current!.zoom;

  function edgeView(edge: PanelEdge) {
    return (
      <div
        className={`${styles.edge} ${edge === 'left' ? styles.left : styles.right} nodrag nopan`}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${label}`}
        data-testid={`resize-${edge}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          drag.current = {
            edge,
            pointerId: event.pointerId,
            startX: event.clientX,
            zoom: flow.getZoom(),
          };
          onLive({ width, shift: 0 });
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          onLive(edgeResize(width, range, drag.current.edge, dxOf(event)));
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          const dx = dxOf(event);
          drag.current = null;
          onLive(null);
          onCommit(edge, dx);
        }}
        onPointerCancel={() => {
          drag.current = null;
          onLive(null);
        }}
      />
    );
  }

  return (
    <>
      {edgeView('left')}
      {edgeView('right')}
    </>
  );
}
