/**
 * useUndoKeys: Ctrl+Z (or Cmd+Z) undoes and Ctrl+Shift+Z redoes a board change (design 11).
 * Ignored in text fields, where the browser's own text undo works.
 */
import { useEffect } from 'react';
import { useBoardStore } from '@/shared/store';

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function useUndoKeys(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      // Some engines report an upper-case key while Shift is held.
      if (event.key.toLowerCase() !== 'z') return;
      if (isTextEntry(event.target)) return;
      event.preventDefault();
      const store = useBoardStore.getState();
      if (event.shiftKey) store.redo();
      else store.undo();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
