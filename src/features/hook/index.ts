/**
 * Hook feature: the Hook Card, its sentence builder, its hover menu, Copy Hook and its
 * fallback dialog. Other
 * features use it only through this file. It never imports the canvas: the canvas passes
 * the stack in.
 */
export { buildHookSentence, type StackEntry } from './buildHookSentence';
export { HookCard, HOOK_NEW_TEXT } from './HookCard';
export { copyHook, type ClipboardLike } from './copyHook';
export { CopyFallbackDialog, COPY_BLOCKED_TEXT } from './CopyFallbackDialog';
export { COPIED_MS, HookMenu } from './HookMenu';
