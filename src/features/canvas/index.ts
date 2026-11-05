/**
 * Canvas feature: the React Flow board canvas and the board rules for stacks, placement
 * and drops. The only folder that imports React Flow. Other features and app/ use the
 * canvas only through this file.
 */
export { BoardCanvas } from './BoardCanvas';
export {
  canDeal,
  combineOnto,
  dealSlots,
  dealStack,
  discardCard,
  dropCard,
  lockCard,
  placeHookCard,
  placeNewCard,
  putOnTopOf,
  redrawAll,
  redrawCard,
  resetLoopText,
  setLoopText,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from './boardActions';
export { conceptCards, conceptLanes, onePagerCardCount, type ConceptLane } from './concept';
export { CanvasProvider, useCanvasApi, type CanvasApi, type CanvasNotice } from './CanvasProvider';
export { boardRects, CARD_SIZE, cardSize, findOpenSpot, HOOK_WIDTH, snapToGrid } from './placement';
export { cardText, hookSentences, isOnTop, loopSteps, onTopCardOf } from './reading';
export { childrenOf, isRoot } from './stack';
