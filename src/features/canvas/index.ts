/**
 * Canvas feature: the React Flow board canvas and the board rules for stacks, placement
 * and drops. The only folder that imports React Flow. Other features and app/ use the
 * canvas only through this file.
 */
export { BoardCanvas } from './BoardCanvas';
export {
  combineOnto,
  discardCard,
  dropCard,
  lockCard,
  placeHookCard,
  placeNewCard,
  putOnTopOf,
  redrawCard,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
export { CanvasProvider, useCanvasApi, type CanvasApi, type CanvasNotice } from './CanvasProvider';
export { boardRects, CARD_SIZE, cardSize, findOpenSpot, HOOK_WIDTH } from './placement';
export { cardText, isOnTop, onTopCardOf } from './reading';
export { childrenOf, isRoot } from './stack';
