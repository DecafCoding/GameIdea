/**
 * useHoverMenu: the hover state of a card's menu in a NodeToolbar, shared by deck cards,
 * the Hook Card and the Core Loop card, so only 1 menu is open at a time. STRIP_GAP is the
 * transparent bridge between the card's top and the menu.
 */
import { useEffect, useRef, useState } from 'react';

/** The strip's bottom sits 4 px above the card's top (user 2026-11-03; design 9.4 said 56). */
export const STRIP_GAP = 4;

/** A menu stays this long after the pointer leaves both the card and the menu (user 2026-11-03). */
export const MENU_HIDE_MS = 1000;

/** Closes the one hover menu now open, so a lingering menu never covers another card. */
let closeOpenMenu: (() => void) | null = null;

/**
 * Hover state for a card's menu: on while the pointer is over the card or the menu, off
 * MENU_HIDE_MS after it leaves both. Only one menu is open at a time: entering another card
 * closes the last one at once, and so does a press anywhere outside the card and its menu.
 * The menu sits on a transparent bridge (STRIP_GAP tall) that reaches down to the card.
 * Cards also call enter on pointer move, because a browser may not send pointerenter to a
 * card that ends up under a still pointer after a drop.
 */
export function useHoverMenu() {
  const [hover, setHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef<() => void>(() => {});

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  // eslint-disable-next-line react-hooks/refs -- set once; read only from event handlers
  close.current = () => {
    clearTimer();
    setHover(false);
    if (closeOpenMenu === close.current) closeOpenMenu = null;
  };

  useEffect(() => {
    if (!hover) return;
    const onPointerDown = (event: PointerEvent) => {
      const at = event.target;
      if (at instanceof Node && (cardRef.current?.contains(at) || menuRef.current?.contains(at))) {
        return;
      }
      close.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [hover]);

  useEffect(
    () => () => {
      clearTimer();
      if (closeOpenMenu === close.current) closeOpenMenu = null;
    },
    [],
  );

  const enter = () => {
    clearTimer();
    if (closeOpenMenu !== close.current) {
      closeOpenMenu?.();
      closeOpenMenu = close.current;
    }
    setHover(true);
  };
  const leave = (event: PointerEvent) => {
    const to = event.relatedTarget;
    if (to instanceof Node && (cardRef.current?.contains(to) || menuRef.current?.contains(to))) {
      return;
    }
    clearTimer();
    hideTimer.current = setTimeout(() => close.current(), MENU_HIDE_MS);
  };
  return { hover, cardRef, menuRef, enter, leave };
}
