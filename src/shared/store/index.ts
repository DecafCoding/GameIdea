/**
 * Store module: the open board (with zundo undo) and the save status in Zustand stores.
 * The only folder that imports Zustand or zundo.
 */
export { UNDO_LIMIT, useBoardStore, useUndoAvailability, type BoardState } from './boardStore';
export { NEW_BOARD_NAME, newBoard } from './newBoard';
export { useSaveStatus, type SaveStatus, type SaveStatusState } from './saveStatus';
