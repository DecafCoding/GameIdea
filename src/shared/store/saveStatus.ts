/**
 * The save status store: what the save mark shows (design 9.10). The autosave watcher in
 * shared/storage sets it; the top bar and the save-failed banner read it.
 */
import { create } from 'zustand';

export type SaveStatus = 'saved' | 'saving' | 'failed';

export interface SaveStatusState {
  status: SaveStatus;
  setStatus: (status: SaveStatus) => void;
}

export const useSaveStatus = create<SaveStatusState>()((set) => ({
  status: 'saved',
  setStatus: (status) => set({ status }),
}));
