/**
 * usePanelClick: a click on the Details panel, the Core Loop card or the Questions panel
 * highlights it for resize (user 2026-11-05). A press and release less than 4 px apart is a
 * click; anything longer is a drag. Only a press where the panel can be dragged counts,
 * never one on a chip, field or button (a .nodrag element). The release is read on the window, because while a
 * node drags the canvas turns its pointer events off, so the release (and React Flow's node
 * click) can land on whatever lies below. PanelHighlightContext comes from BoardCanvas,
 * which holds the highlight as view state.
 */
import { createContext, useContext, type PointerEvent } from 'react';
import type { PanelKind } from './panelResize';

/** Highlights a panel. */
export const PanelHighlightContext = createContext<((kind: PanelKind) => void) | null>(null);

const CLICK_DISTANCE = 4;

export function usePanelClick(kind: PanelKind) {
  const highlight = useContext(PanelHighlightContext);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !highlight) return;
      // Chips, fields and buttons are not where a panel is grabbed: no highlight.
      if (event.target instanceof Element && event.target.closest('.nodrag')) return;
      const { pointerId, clientX, clientY } = event;
      const onUp = (up: globalThis.PointerEvent) => {
        if (up.pointerId !== pointerId) return;
        window.removeEventListener('pointerup', onUp, true);
        if (Math.hypot(up.clientX - clientX, up.clientY - clientY) < CLICK_DISTANCE) {
          // After this release's click, which may land on a node or the canvas below and
          // clear the highlight.
          setTimeout(() => highlight(kind), 0);
        }
      };
      window.addEventListener('pointerup', onUp, true);
    },
  };
}
