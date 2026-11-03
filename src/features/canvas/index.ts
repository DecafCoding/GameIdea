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
  placeNewCard,
  redrawCard,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
export { CanvasProvider, useCanvasApi, type CanvasApi } from './CanvasProvider';
export { boardRects, CARD_SIZE, findOpenSpot } from './placement';
export { childrenOf, isRoot } from './stack';
