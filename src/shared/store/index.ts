/**
 * Store module: the open board (with zundo undo) and the save status in Zustand stores.
 * The only folder that imports zundo; features/settings keeps its own small Zustand store.
 */
export { UNDO_LIMIT, useBoardStore, useUndoAvailability, type BoardState } from './boardStore';
export { NEW_BOARD_NAME, newBoard, ONE_PAGER_HOOK_SPOT, ONE_PAGER_LOOP_SPOT } from './newBoard';
export { useSaveStatus, type SaveStatus, type SaveStatusState } from './saveStatus';
