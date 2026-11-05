/**
 * Core Loop feature: the Core Loop card's pure live text builder, its card view with the
 * edit field and its icon menu (Copy Loop, Reset From Cards). Other features use it only
 * through this file. It never imports the canvas: the canvas works out the steps from the
 * board and passes the parts and texts in, as it does for the hook feature.
 */
export {
  buildLoopText,
  LOOP_ARROW,
  LOOP_STEPS,
  type LoopDeck,
  type LoopPart,
  type LoopSteps,
} from './buildLoopText';
export { LoopCard, LOOP_EMPTY_TEXT } from './LoopCard';
export { LoopMenu } from './LoopMenu';
