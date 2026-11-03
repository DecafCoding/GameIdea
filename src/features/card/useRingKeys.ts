/**
 * useRingKeys: R turns the outer (or only) ring and Shift+R the inner ring, one step
 * clockwise, on the card the caller names (under the pointer, else focused or selected).
 * Keys typed into text fields and Ctrl/Meta/Alt chords such as Ctrl+R are left alone.
 */
import { useEffect, useRef } from 'react';
import type { RingSlot } from './rings';

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function useRingKeys(
  getTargetId: () => string | null,
  onTurn: (cardId: string, slot: RingSlot) => void,
): void {
  // The latest callbacks, so the window listener is added once.
  const latest = useRef({ getTargetId, onTurn });
  useEffect(() => {
    latest.current = { getTargetId, onTurn };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'r') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTextEntry(event.target)) return;
      const id = latest.current.getTargetId();
      if (id === null) return;
      event.preventDefault();
      latest.current.onTurn(id, event.shiftKey ? 'inner' : 'outer');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
