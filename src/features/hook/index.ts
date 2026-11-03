/**
 * Hook feature: the Hook Card, its sentence builder, Copy and its fallback dialog. Other
 * features use it only through this file. It never imports the canvas: the canvas passes
 * the stack in.
 */
export { buildHookSentence, type StackEntry } from './buildHookSentence';
export { HookCard, HOOK_NEW_TEXT } from './HookCard';
