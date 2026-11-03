/**
 * Card feature: the card view, the ring control and the ring math.
 * Other features use the card only through this file.
 */
export { CardStrip } from './CardStrip';
export { CardView, type CardPaper } from './CardView';
export { RingControl } from './RingControl';
export { TYPE_ICON, TypeDisc } from './TypeDisc';
export { useRingKeys } from './useRingKeys';
export {
  activeText,
  combine,
  edgeCues,
  isCombined,
  ringIndexFor,
  ringWord,
  split,
  swap,
  turnCard,
  turnRing,
  type EdgeCue,
  type RingSlot,
  type TurnDirection,
} from './rings';
